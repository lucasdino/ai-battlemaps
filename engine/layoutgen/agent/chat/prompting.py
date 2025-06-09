import json
import os
from typing import Dict, List, Optional, Tuple

class ChatPrompt:
    """
    Load one or more JSON prompt files from ./prompts/ and render them
    with .format() substitution.

    Example
    -------
    loader = ChatPrompt(["prompts.json", "extra.json"])
    rendered = loader.render(
        "room_generation",
        user_args   = {"room_map": "...", "asset_list": "...", "prompt": "..."},
        system_args = {},                      # optional
    )
    system_text, user_text = rendered            # tuple unpack
    """

    def __init__(self, filenames: List[str], prompts_dir: str = "prompts") -> None:
        self.prompts: Dict[str, Dict[str, str]] = {}
        base = os.path.join(os.path.dirname(__file__), prompts_dir)

        for fname in filenames:
            path = os.path.join(base, fname)
            if not os.path.isfile(path):
                raise FileNotFoundError(f"Prompt file not found: {path}")

            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)

            for name, tpl in data.items():
                if name in self.prompts:
                    raise ValueError(f"Duplicate prompt name '{name}' in {fname}")
                self.prompts[name] = tpl

    # ------------------------------------------------------------------ #
    # public                                                             #
    # ------------------------------------------------------------------ #
    def list(self) -> List[str]:
        """Return all loaded prompt names."""
        return list(self.prompts.keys())

    def get_prompt(
        self,
        name: str,
        system_args: Optional[Dict[str, str]] = None,
        user_args:   Optional[Dict[str, str]] = None,
    ) -> Tuple[str, str]:
        """
        Return (system_text, user_text) after .format() substitution.

        Any KeyError from .format() is re-raised as ValueError for clarity.
        """
        if name not in self.prompts:
            raise ValueError(f"Unknown prompt '{name}'. Available: {self.list()}")

        tpl = self.prompts[name]
        system_tmpl = tpl.get("system", "")
        user_tmpl   = tpl.get("user", "")

        try:
            system_text = system_tmpl.format(**(system_args or {}))
            user_text   = user_tmpl.format(**(user_args   or {}))
        except KeyError as e:
            raise ValueError(f"Missing argument for prompt '{name}': {e}")

        return system_text, user_text