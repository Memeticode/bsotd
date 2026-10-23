
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from typing import Any

import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer


@dataclass(frozen=True)
class TfidfConfiguration:
    """How a daily corpus is fitted. Corpora fitted another way are
    rebuilt the next time their day is vectorized."""

    version: str = "1"
    lowercase: bool = True
    strip_accents: str = "unicode"
    stop_words: str = "english"
    # Word pairs help tell apart stories that share vocabulary.
    ngram_range: tuple[int, int] = (1, 2)
    sublinear_tf: bool = True
    norm: str = "l2"

    def vectorizer(self) -> TfidfVectorizer:
        return TfidfVectorizer(
            lowercase=self.lowercase,
            strip_accents=self.strip_accents,
            stop_words=self.stop_words,
            ngram_range=self.ngram_range,
            sublinear_tf=self.sublinear_tf,
            norm=self.norm,
        )

    def to_json(self) -> dict[str, Any]:
        """The settings as stored with a corpus, for reproducibility."""
        settings: dict[str, Any] = asdict(self)
        settings["ngram_range"] = list(self.ngram_range)
        settings["input"] = "title and description"
        settings["scikit_learn"] = sklearn.__version__
        return settings


@dataclass(frozen=True)
class FittedCorpus:
    # Term -> 0-based column index.
    vocabulary: dict[str, int]
    # By column index.
    idf_weights: list[float]
    # One pgvector sparsevec literal per document, in input order.
    vectors: list[str]


def fit_corpus(
    texts: Sequence[str],
    configuration: TfidfConfiguration,
) -> FittedCorpus:
    vectorizer = configuration.vectorizer()
    matrix = vectorizer.fit_transform(texts).tocsr()
    matrix.sort_indices()

    dimensions = len(vectorizer.vocabulary_)

    vectors = [
        to_sparsevec(
            matrix.indices[start:end],
            matrix.data[start:end],
            dimensions,
        )
        for start, end in zip(matrix.indptr[:-1], matrix.indptr[1:])
    ]

    return FittedCorpus(
        vocabulary={
            term: int(index)
            for term, index in vectorizer.vocabulary_.items()
        },
        idf_weights=[float(weight) for weight in vectorizer.idf_],
        vectors=vectors,
    )


def to_sparsevec(
    indices: Sequence[int],
    values: Sequence[float],
    dimensions: int,
) -> str:
    """pgvector's sparsevec text format, which numbers dimensions from 1:
    {1:0.5,3:0.25}/1000"""
    entries = ",".join(
        f"{int(index) + 1}:{float(value):.7g}"
        for index, value in zip(indices, values)
    )
    return f"{{{entries}}}/{dimensions}"
