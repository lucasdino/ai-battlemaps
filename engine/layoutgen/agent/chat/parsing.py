import re
import ast
from typing import List, Optional, Dict

class ParsingError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self):
        return self.message


# =================================================
# Extraction Functionality
# =================================================
def extract_answer_tags(text: str) -> str:
    """
    Extract all text within <answer> </answer> tags from the input text.
    
    Args:
        text (str): The input text to search for answer tags
        
    Returns str of the text that was between the last answer tags that were provided.
    """
    try:
        pattern = r'<answer>(.*?)</answer>'
        matches = re.findall(pattern, text, re.DOTALL)      
        match = matches[-1]    # Ensure if multiple matches we only take our last one
        stripped_match = match.strip()
    except:
        raise ParsingError("Model response wasn't provided within answer tags (e.g., <answer> model_answer </answer>). Please ensure model is provided in the desired format. Note that if there are multiple 'answer' tag pairs we return the values that are in the final match instance.")
    return stripped_match


# =================================================
# Coercion functionality
# =================================================
_WORD     = re.compile(r"(?<!['\"])\b\w+\b(?!['\"])")          # bareword / char
_BRACKET  = re.compile(r"\]\s*\[")                             # “][” → “],[”

def _safe_quote(match: re.Match) -> str:
    token = match.group(0)
    # leave numerics, None/True/False alone – everything else is a string
    if token.isdigit() or token in {"None", "True", "False"}:
        return token
    return f"'{token}'"

def _coerce_to_2d_list(text: str) -> List[List[str]]:
    """Force arbitrary LM output into a 2-D list of str."""
    try:
        txt = text.replace('\n', '').strip()

        # First, try the easy case.
        try:
            arr = ast.literal_eval(txt)
        except (ValueError, SyntaxError):
            # Normalize common structural issues.
            if not txt.lstrip().startswith('['):
                txt = f'[{txt}]'                        # wrap missing outer []
            txt = _BRACKET.sub('],[', txt)              # ensure commas between sub-lists
            txt = _WORD.sub(_safe_quote, txt)           # quote random barewords
            arr = ast.literal_eval(txt)                 # second (robust) parse

        # Guarantee 2-D shape.
        if not isinstance(arr, list):
            arr = [[str(arr)]]
        elif not any(isinstance(el, list) for el in arr):
            arr = [arr]

        # Coerce every element to string.
        return [[str(e) for e in row] for row in arr]
    except Exception:
        raise ParsingError("The response extracted from within answer tags (e.g., <answer> model_response </answer>) was not provided as a 2D Python list (e.g., '[[1, 2, 3], ...]'). Ensure the only thing in the answer tags is a valid 2D Python list with no other text provided.")

def _coerce_to_1d_list(text: str) -> list[str]:
    """Force arbitrary LM output into a 1-D list of str."""
    try:
        txt = text.replace('\n', '').strip()
        try:
            arr = ast.literal_eval(txt)
        except (ValueError, SyntaxError):
            if not txt.lstrip().startswith('['):
                txt = f'[{txt}]'
            arr = _WORD.sub(lambda m: f"'{m.group(0)}'", txt)
            arr = ast.literal_eval(arr)
        if not isinstance(arr, list):
            arr = [str(arr)]
        return [str(e) for e in arr]
    except Exception:
        raise ParsingError("The response was not provided as a 1D Python list (e.g., '[foo, bar, baz]'). Ensure the answer is a valid 1D Python list.")

def _coerce_to_dict(text: str) -> Dict:
    try:
        text = text.replace('\n', '').strip()
        parsed_dict = ast.literal_eval(text)
        if not isinstance(parsed_dict, dict):
            raise ValueError("Parsed result is not a dictionary")        
        return {str(k): str(v) for k, v in parsed_dict.items()}
    except:
        raise ParsingError("The extracted answer was not able to be correctly handled by ast.literal_eval to convert into a proper python dictionary.")

# =================================================
# Main external calls
# =================================================
def parse_dungeon_layout(num_dungeons: int, model_response: str):
    """
    Takes in the text response from a language model, extracts from the answer tags, and tries to parse into a dictionary of strings.
    """
    extracted_text = _coerce_to_dict(extract_answer_tags(model_response))

    key_nums = set()
    for k, v in extracted_text.items():
        key_nums.add(int(k))
    if key_nums != set(range(num_dungeons)):
        raise ValueError(f"Model response does not have the correct format for the python dictionary. We expect 'k': 'v' to be so that 'k' is the index relating to a room (int) and we expect that all rooms have a valid key: value mapping. We extracted the following keys from the model response: {sorted(key_nums)} -- expected: {sorted(range(num_dungeons))}.")
    
    return extracted_text


def parse_asset_lists(full_id_map: List, dungeon_layout_dict: Dict, model_response: str) -> Dict:
    """
    Takes in a text responose from a language model and tries to parse / map it so that we have a valid list of assets for our LLM designer to choose from.
    """
    extracted_text = _coerce_to_dict(extract_answer_tags(model_response))
    
    # Ensure each key is a valid list
    coerced_text = dict()
    for k, v in extracted_text.items():
        coerced_text[k] = _coerce_to_1d_list(v)

    # First ensure that we have lists for each room
    expected_keys = set(dungeon_layout_dict.keys())
    extracted_keys = set(coerced_text.keys())
    if expected_keys != extracted_keys:
        raise ValueError(f"We expected a dictionary that maps each provided dungeon room to a list of assets. Our extracted and parsed dictionary didn't contain all the expected room id keys. Expected the following keys {sorted(expected_keys)} but only extracted: {sorted(extracted_keys)}.")

    # Next keep a list of all the ids that we received that don't map to ids in 'full_id_key'.
    invalid_ids = set()
    valid_ids = set(full_id_map.keys())
    for _, id_list in coerced_text.items():
        for id in id_list:
            if id not in valid_ids:
                invalid_ids.add(id)
    
    # Throw error if invalid ids exist
    if len(invalid_ids) > 0:
        if len(invalid_ids) > 10:
            raise ValueError(f"We received >10 elements in your id list that do not correctly map to the ids provided. Some of the values we extracted are the following: {sorted(invalid_ids)[:10]}")
        raise ValueError(f"We received invalid elements in your id list that do not correctly map to the ids provided. The values we extracted that do not map to the provided assets ids are the following: {sorted(invalid_ids)}")

    # Lastly return a list of tuples (name, desc, asset_id)
    final_asset_list = dict()
    for room_id, room_assets in coerced_text.items():
        room_asset_list = []
        for id in room_assets:
            name, description = full_id_map[id]
            room_asset_list.append((name, description, id))
        final_asset_list[room_id] = room_asset_list           

    return final_asset_list

def parse_design_room(asset_list_key: Dict, room_map, model_response: str):
    """ 
    Takes in an asset list key and our model response and attempts to parse the model response then map the values that were parsed to the asset_list_key.
    """
    parsed_arr = _coerce_to_2d_list(extract_answer_tags(model_response))

    # --- Shape check first ---
    if len(parsed_arr) != room_map.shape[0] or any(len(row) != room_map.shape[1] for row in parsed_arr):
        raise ValueError(f"Model response dimensions do not match room map. Expected shape {room_map.shape}, but got shape ({len(parsed_arr)}, {len(parsed_arr[0])}).")

    def _map_values(value):
        if value == '2' or value == '1' or value == '0' or value == 2 or value == 1 or value == 0:
            return int(value)
        else:
            try:
                return asset_list_key[value]
            except:
                raise ValueError(
                    f"Model response has values that do not map to our provided list of acceptable asset keys! "
                    f"Element in parsed model response was {value} and does not match provided keys: {asset_list_key.keys()}."
                )

    # --- Overlay validity check ---
    for r in range(len(parsed_arr)):
        for c in range(len(parsed_arr[r])):
            if room_map[r, c] == 0 and parsed_arr[r][c] != 0:
                raise ValueError(
                    f"Model response doesn't overlay correctly on the provided 2d array at ({r}, {c}). "
                    f"Please ensure the 2d list returned only updates values that are either '1' (floor) or 'D' (door)."
                )

    return [[_map_values(x) for x in row] for row in parsed_arr]