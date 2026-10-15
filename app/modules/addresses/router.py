"""
Address management API endpoints.

Provides authenticated CRUD operations for addresses:
- Create an address.
- List addresses with pagination.
- Retrieve an address by ID.
- Update an existing address.
- Delete an address.

All endpoints require a valid bearer access token.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.infrastructure.database.session import get_db_session
from app.modules.addresses.schemas import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
)
from app.modules.addresses.service import (
    create_address,
    delete_address,
    get_address_by_id,
    list_addresses,
    update_address,
)
from app.shared.response import APIResponse


# ---------------------------------------------------------------------------
# Router configuration
# ---------------------------------------------------------------------------

router = APIRouter(
    prefix="/addresses",
    tags=["Master Data - Addresses"],
    dependencies=[Depends(get_current_user)],
    responses={
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Missing, invalid, or expired access token.",
        },
        status.HTTP_403_FORBIDDEN: {
            "description": "The authenticated user is not allowed to access the API.",
        },
    },
)


# Reusable dependency for obtaining an asynchronous database session.
DatabaseSession = Annotated[AsyncSession, Depends(get_db_session)]


# ---------------------------------------------------------------------------
# Create address
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=APIResponse[AddressResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create an address",
    description=(
        "Creates a new address using the supplied address information. "
        "A valid bearer access token is required. Duplicate addresses "
        "are rejected when detected by the service."
    ),
    responses={
        status.HTTP_201_CREATED: {
            "description": "Address created successfully.",
        },
        status.HTTP_409_CONFLICT: {
            "description": "The address is a duplicate or conflicts with database records.",
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "description": "The request body failed validation.",
        },
    },
)
async def create_address_endpoint(
    address_data: AddressCreate,
    session: DatabaseSession,
) -> APIResponse[AddressResponse]:
    """
    Create an address.

    Args:
        address_data: Validated address fields supplied in the request body.
        session: Asynchronous database session.

    Returns:
        An API response containing a success message and the created address.

    Raises:
        HTTPException: 409 when a duplicate or database conflict is detected.
    """

    try:
        # Create the address through the service layer.
        address = await create_address(session, address_data)

    except ValueError as exc:
        # Translate expected business-rule failures into HTTP 409.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except IntegrityError as exc:
        # Avoid exposing internal database details to API consumers.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The address conflicts with existing database records.",
        ) from exc

    # Convert the ORM model into the public response schema.
    return APIResponse(
        message="Address created successfully.",
        data=AddressResponse.model_validate(address),
    )


# ---------------------------------------------------------------------------
# List addresses
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=APIResponse[list[AddressResponse]],
    status_code=status.HTTP_200_OK,
    summary="List addresses",
    description=(
        "Returns a paginated list of addresses. "
        "A valid bearer access token is required."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Addresses retrieved successfully.",
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "description": "Invalid pagination parameters.",
        },
    },
)
async def list_addresses_endpoint(
    session: DatabaseSession,
    offset: int = Query(
        default=0,
        ge=0,
        description="Number of records to skip.",
        examples=[0, 20],
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Maximum number of records to return (1–100).",
        examples=[20, 50],
    ),
) -> APIResponse[list[AddressResponse]]:
    """
    Retrieve addresses with pagination.

    Args:
        session: Asynchronous database session.
        offset: Number of records to skip.
        limit: Maximum number of records to return.

    Returns:
        An API response containing the list of addresses.
    """

    # Retrieve the requested page from the service layer.
    addresses = await list_addresses(
        session=session,
        offset=offset,
        limit=limit,
    )

    # Convert every ORM object into its corresponding response schema.
    address_items = [
        AddressResponse.model_validate(address)
        for address in addresses
    ]

    return APIResponse(
        message="Addresses retrieved successfully.",
        data=address_items,
    )


# ---------------------------------------------------------------------------
# Retrieve address by ID
# ---------------------------------------------------------------------------

@router.get(
    "/{address_id}",
    response_model=APIResponse[AddressResponse],
    status_code=status.HTTP_200_OK,
    summary="Get an address",
    description=(
        "Retrieves a single address by its database ID. "
        "A valid bearer access token is required."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Address retrieved successfully.",
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Address not found.",
        },
    },
)
async def get_address_endpoint(
    address_id: int,
    session: DatabaseSession,
) -> APIResponse[AddressResponse]:
    """
    Retrieve one address by its database ID.

    Args:
        address_id: Primary key of the address.
        session: Asynchronous database session.

    Returns:
        An API response containing the requested address.

    Raises:
        HTTPException: 404 if the address does not exist.
    """

    # Fetch the address using the service layer.
    address = await get_address_by_id(session, address_id)

    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found.",
        )

    return APIResponse(
        message="Address retrieved successfully.",
        data=AddressResponse.model_validate(address),
    )


# ---------------------------------------------------------------------------
# Update address
# ---------------------------------------------------------------------------

@router.patch(
    "/{address_id}",
    response_model=APIResponse[AddressResponse],
    status_code=status.HTTP_200_OK,
    summary="Update an address",
    description=(
        "Updates the supplied fields of an existing address. "
        "Only fields provided in the request body should be changed. "
        "A valid bearer access token is required."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Address updated successfully.",
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Address not found.",
        },
        status.HTTP_409_CONFLICT: {
            "description": "The update would create a duplicate or database conflict.",
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "description": "The request body failed validation.",
        },
    },
)
async def update_address_endpoint(
    address_id: int,
    address_data: AddressUpdate,
    session: DatabaseSession,
) -> APIResponse[AddressResponse]:
    """
    Update an existing address.

    Args:
        address_id: Primary key of the address to update.
        address_data: Fields to update.
        session: Asynchronous database session.

    Returns:
        An API response containing the updated address.

    Raises:
        HTTPException: 404 if the address does not exist.
        HTTPException: 409 if a duplicate or database conflict occurs.
    """

    try:
        # Apply the requested changes through the service layer.
        address = await update_address(
            session=session,
            address_id=address_id,
            address_data=address_data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The address conflicts with existing database records.",
        ) from exc

    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found.",
        )

    return APIResponse(
        message="Address updated successfully.",
        data=AddressResponse.model_validate(address),
    )


# ---------------------------------------------------------------------------
# Delete address
# ---------------------------------------------------------------------------

@router.delete(
    "/{address_id}",
    response_model=APIResponse[dict[str, int]],
    status_code=status.HTTP_200_OK,
    summary="Delete an address",
    description=(
        "Permanently deletes an address by its database ID. "
        "Deletion may fail if the address is referenced by other records. "
        "A valid bearer access token is required."
    ),
    responses={
        status.HTTP_200_OK: {
            "description": "Address deleted successfully.",
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Address not found.",
        },
        status.HTTP_409_CONFLICT: {
            "description": "The address cannot be deleted because another record references it.",
        },
    },
)
async def delete_address_endpoint(
    address_id: int,
    session: DatabaseSession,
) -> APIResponse[dict[str, int]]:
    """
    Permanently delete an address.

    Args:
        address_id: Primary key of the address to delete.
        session: Asynchronous database session.

    Returns:
        An API response containing the deleted address ID.

    Raises:
        HTTPException: 404 if the address does not exist.
        HTTPException: 409 if a database constraint prevents deletion.
    """

    try:
        # Delegate deletion to the service layer.
        deleted = await delete_address(
            session=session,
            address_id=address_id,
        )

    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The address cannot be deleted because "
                "it is referenced by other records."
            ),
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found.",
        )

    # HTTP 200 allows the response body to contain a success message.
    return APIResponse(
        message="Address deleted successfully.",
        data={"id": address_id},
    )