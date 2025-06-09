import base64
import requests
import aiohttp
import asyncio
from typing import Any, Dict, Callable
from .config import config


class ChatAPI:
    """Stateless multi-provider chat wrapper."""

    # ---------- public -------------------------------------------------
    def chat(
        self,
        model: str,
        system: str,
        user: str,
        img_path: str = None,
        **opts: Any,                # temperature, max_tokens, etc.
    ) -> str:
        """Send `user` / `system` to the requested `model`, return text."""
        # Optional printing you can turn on for debugging
        # print(f"Sending Request:\n\nSystem:\n{system}\n\nUser:\n{user}")
        
        m = self._resolve_model(model)
        agg_opts = self._aggregate_gen_args(m, opts)
        try:
            send = {
                "openai":    self._openai,
                "anthropic": self._anthropic,
                "google":    self._google,
            }[m.provider]
            return send(m, system, user, img_path, **agg_opts)
        except Exception as e:
            send = {
                "openai":    self._openai,
                "anthropic": self._anthropic,
                "google":    self._google,
            }[m.provider]
            return send(m, "", str(e), **agg_opts)

    async def chat_async(
        self,
        model: str,
        system: str,
        user: str,
        img_path: str = None,
        **opts: Any,                # temperature, max_tokens, etc.
    ) -> str:
        """Async version of chat method."""
        # Optional printing you can turn on for debugging
        # print(f"Sending Request:\n\nSystem:\n{system}\n\nUser:\n{user}")
        
        m = self._resolve_model(model)
        agg_opts = self._aggregate_gen_args(m, opts)
        try:
            send = {
                "openai":    self._openai_async,
                "anthropic": self._anthropic_async,
                "google":    self._google_async,
            }[m.provider]
            return await send(m, system, user, img_path, **agg_opts)
        except Exception as e:
            send = {
                "openai":    self._openai_async,
                "anthropic": self._anthropic_async,
                "google":    self._google_async,
            }[m.provider]
            return await send(m, "", str(e), **agg_opts)
            
    def chat_parsed(
        self,
        model: str,
        system: str,
        user: str,
        img_path: str,
        parser_func: Callable[[str], str],
        max_generations: int = 2,
        **opts: Any,        
    ) -> str:
        num_generations = 0
        last_exc = None
        last_resp = None
        failed_sys_prompt = "You are a helpful AI asssistant. A previous AI generation failed to generate in our required return format. Please review this interaction and either reformat or complete the generation to satisfy the specifications in the 'Attempted System Prompt'."
        while num_generations < max_generations:
            if num_generations == 0:
                curr_sys, curr_user = system, user
            else:
                curr_sys = failed_sys_prompt
                curr_user = (
                    f"{type(last_exc).__name__}: {last_exc}\n\n"
                    f"Attempted System Prompt:\n{system}\n\n"
                    f"Attempted User Prompt:\n{user}\n\n"
                    f"Generated Model Response:\n{last_resp}"
                )
            try:
                last_resp = self.chat(model, curr_sys, curr_user, img_path, **opts)
                return parser_func(model_response=last_resp)
            except Exception as e:
                print(f"REQUEST FAILED:\n{e}")
                last_exc = e
                num_generations += 1
        raise ValueError(f"Model made maximum number of generation attempts ({max_generations}) unsuccessfully!")

    async def chat_parsed_async(
        self,
        model: str,
        system: str,
        user: str,
        img_path: str,
        parser_func: Callable[[str], str],
        max_generations: int = 2,
        **opts: Any,        
    ) -> str:
        """Async version of chat_parsed method."""
        num_generations = 0
        last_exc = None
        last_resp = None
        failed_sys_prompt = "You are a helpful AI asssistant. A previous AI generation failed to generate in our required return format. Please review this interaction and either reformat or complete the generation to satisfy the specifications in the 'Attempted System Prompt'."
        while num_generations < max_generations:
            if num_generations == 0:
                curr_sys, curr_user = system, user
            else:
                curr_sys = failed_sys_prompt
                curr_user = (
                    f"{type(last_exc).__name__}: {last_exc}\n\n"
                    f"Attempted System Prompt:\n{system}\n\n"
                    f"Attempted User Prompt:\n{user}\n\n"
                    f"Generated Model Response:\n{last_resp}"
                )
            try:
                last_resp = await self.chat_async(model, curr_sys, curr_user, img_path, **opts)
                return parser_func(model_response=last_resp)
            except Exception as e:
                print(f"REQUEST FAILED:\n{e}")
                last_exc = e
                num_generations += 1
        raise ValueError(f"Model made maximum number of generation attempts ({max_generations}) unsuccessfully!")

    # ---------- helpers -----------------------------------------------
    @staticmethod
    def _resolve_model(name_or_id: str):
        try:                  # prefer explicit name match
            return config.get_model_by_name(name_or_id)
        except ValueError:    # fall back to id
            return config.get_model_by_id(name_or_id)
        
    @staticmethod
    def _aggregate_gen_args(model, opts):
        if model.gen_args is None:
            return opts
        for key, value in model.gen_args.items():
            if key not in opts:
                opts[key] = value
        
        return opts

    # ---------- provider back-ends ------------------------------------
    def _openai(self, m, system: str, user: str, img_path: str, **o) -> str:
        msg_parts = [{"type": "text", "text": user}]
        
        if img_path is not None:
            with open(img_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
            mime = "image/jpeg" if img_path.lower().endswith((".jpg", ".jpeg")) else "image/png"
            msg_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime};base64,{encoded}"
                }
            })

        payload = {
            "model": m.id,
            "messages": [
                {"role": "system", "content": [{"type": "text", "text": system}]},
                {"role": "user",   "content": msg_parts},
            ],
            **o,
        }

        r = requests.post(
            config.get_base_url("openai"),
            headers={
                "Authorization": f"Bearer {config.get_api_key('openai')}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]

    async def _openai_async(self, m, system: str, user: str, img_path: str, **o) -> str:
        msg_parts = [{"type": "text", "text": user}]
        
        if img_path is not None:
            with open(img_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
            mime = "image/jpeg" if img_path.lower().endswith((".jpg", ".jpeg")) else "image/png"
            msg_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime};base64,{encoded}"
                }
            })

        payload = {
            "model": m.id,
            "messages": [
                {"role": "system", "content": [{"type": "text", "text": system}]},
                {"role": "user",   "content": msg_parts},
            ],
            **o,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                config.get_base_url("openai"),
                headers={
                    "Authorization": f"Bearer {config.get_api_key('openai')}",
                    "Content-Type": "application/json",
                },
                json=payload,
            ) as response:
                response.raise_for_status()
                result = await response.json()
                return result["choices"][0]["message"]["content"]

    def _anthropic(self, m, system: str, user: str, img_path: str, **o) -> str:
        msg_parts = []
        if img_path is not None:
            with open(img_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
            mime = "image/jpeg" if img_path.lower().endswith((".jpg", ".jpeg")) else "image/png"
            msg_parts.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime,
                    "data": encoded,
                },
            })
        msg_parts.append({"type": "text", "text": user})

        payload = {
            "model": m.id,
            "max_tokens": 3000,
            "system": system,
            "messages": [
                {"role": "user", "content": msg_parts},
            ],
            **o,
        }

        r = requests.post(
            config.get_base_url("anthropic"),
            headers={
                "x-api-key": config.get_api_key("anthropic"),
                "content-type": "application/json",
                "anthropic-version": "2023-06-01",
            },
            json=payload,
        )
        if r.status_code >= 400:
            print(f"{r.status_code}: {r.text}")
        r.raise_for_status()
        return r.json()["content"][0]["text"]

    async def _anthropic_async(self, m, system: str, user: str, img_path: str, **o) -> str:
        msg_parts = []
        if img_path is not None:
            with open(img_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
            mime = "image/jpeg" if img_path.lower().endswith((".jpg", ".jpeg")) else "image/png"
            msg_parts.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime,
                    "data": encoded,
                },
            })
        msg_parts.append({"type": "text", "text": user})

        payload = {
            "model": m.id,
            "max_tokens": 3000,
            "system": system,
            "messages": [
                {"role": "user", "content": msg_parts},
            ],
            **o,
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                config.get_base_url("anthropic"),
                headers={
                    "x-api-key": config.get_api_key("anthropic"),
                    "content-type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                json=payload,
            ) as response:
                if response.status >= 400:
                    text = await response.text()
                    print(f"{response.status}: {text}")
                response.raise_for_status()
                result = await response.json()
                return result["content"][0]["text"]

    def _google(self, m, system: str, user: str, img_path: str = None, **o) -> str:
        url = config.get_base_url("google").format(id=m.id,
                                                   api_key=config.get_api_key("google"))
        
        # Since not using Google for now hold off on this
        if img_path is not None:
            raise NotImplementedError("VLM functionality not implemented for Google endpoint.")
        
        r = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": f"{system}\n\nUser: {user}"}]}],
                "generationConfig": {
                    **o,
                },
            },
        )
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]

    async def _google_async(self, m, system: str, user: str, img_path: str = None, **o) -> str:
        url = config.get_base_url("google").format(id=m.id,
                                                   api_key=config.get_api_key("google"))
        
        # Since not using Google for now hold off on this
        if img_path is not None:
            raise NotImplementedError("VLM functionality not implemented for Google endpoint.")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": f"{system}\n\nUser: {user}"}]}],
                    "generationConfig": {
                        **o,
                    },
                },
            ) as response:
                response.raise_for_status()
                result = await response.json()
                return result["candidates"][0]["content"]["parts"][0]["text"]
