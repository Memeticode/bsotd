
import hashlib


def build_input_text(title: str | None, description: str | None) -> str:
    """An article's title and description, one per line: the text that
    embeddings and TF-IDF vectors are computed from."""
    parts = [
        (title or "").strip(),
        (description or "").strip(),
    ]
    return "\n".join(part for part in parts if part)


def hash_input_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
