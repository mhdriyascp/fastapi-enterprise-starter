import logging

from app.infrastructure.database.session import SessionFactory
from app.seeds.registry import SEED_REGISTRY

logger = logging.getLogger(__name__)


async def run_seeds() -> None:
    """Run all registered seeds in a single database transaction."""
    async with SessionFactory() as db:
        try:
            async with db.begin():
                for seed_name, seed_function in SEED_REGISTRY:
                    logger.info("Running seed: %s", seed_name)

                    await seed_function(db)

                    logger.info("Completed seed: %s", seed_name)

        except Exception:
            logger.exception(
                "Seed execution failed. All changes were rolled back."
            )
            raise

    logger.info("All seeds completed successfully.")
    print("All seeds completed successfully.")