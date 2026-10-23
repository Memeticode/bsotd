
from collections.abc import Sequence


class TextEmbedder:
    DEFAULT_MODEL = "BAAI/bge-small-en-v1.5"

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        batch_size: int = 64,
    ) -> None:
        # Imported here so code that only needs DEFAULT_MODEL doesn't
        # load ONNX Runtime.
        from fastembed import TextEmbedding

        self._model_name = model
        self._batch_size = batch_size

        # Downloads the model on first use. Set FASTEMBED_CACHE_PATH
        # to keep it somewhere more durable than the temp directory.
        self._model = TextEmbedding(model_name=model)

    @property
    def model(self) -> str:
        return self._model_name

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []

        return [
            vector.tolist()
            for vector in self._model.embed(
                list(texts),
                batch_size=self._batch_size,
            )
        ]
