"""Shared sorting utilities for enterprise list endpoints."""

from dataclasses import dataclass
from typing import Literal

from fastapi import Query


@dataclass(frozen=True, slots=True)
class SortParams:
    """Validated sorting parameters for list queries.

    Attributes:
        sort_by: Field/column name to order by.
        sort_order: Sort direction ('asc' or 'desc').
    """

    sort_by: str
    sort_order: Literal["asc", "desc"]


def get_sorting(
    sort_by: str = Query(
        default="created_at",
        description="Field/column name to sort records by.",
        examples=["created_at", "name", "code", "id"],
    ),
    sort_order: Literal["asc", "desc"] = Query(
        default="desc",
        description="Sort direction: 'asc' for ascending, 'desc' for descending.",
        examples=["asc", "desc"],
    ),
) -> SortParams:
    """Resolve and validate sorting query parameters."""
    return SortParams(
        sort_by=sort_by.strip(),
        sort_order=sort_order,
    )
