
import hashlib


# How much of an article's content joins its title and description. Its
# opening carries the specifics when a headline is generic, such as "cloud
# cover forecast by region" for an article about a meteor shower. Much more
# brings in background that makes different stories look alike.
OPENING_CHARACTERS = 300

# What the text is made of, as recorded with each TF-IDF corpus.
INPUT_DESCRIPTION = (
    f"title, description and the first {OPENING_CHARACTERS} characters "
    "of content"
)


def build_input_text(
    title: str | None,
    description: str | None,
    content: str | None,
) -> str:
    """An article's title, description and the opening of its content, one
    per line: the text that embeddings and TF-IDF vectors are computed from."""
    parts = [
        (title or "").strip(),
        (description or "").strip(),
        opening(content),
    ]
    return "\n".join(part for part in parts if part)


def opening(content: str | None) -> str:
    """Up to OPENING_CHARACTERS of the content, cut at the end of a word."""
    text = (content or "").strip()

    if len(text) <= OPENING_CHARACTERS:
        return text

    cut = text[:OPENING_CHARACTERS + 1]
    return cut[:cut.rfind(" ")].rstrip() if " " in cut else cut[:-1]


def hash_input_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
