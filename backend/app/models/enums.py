"""
Enumerations used across the application.
"""

from enum import Enum


class OrderStatus(str, Enum):
    """Normalised order-outcome statuses.

    Values are lower-case to match how we normalise ``Live Order Status``
    from Meesho's export.
    """

    DELIVERED = "delivered"
    EXCHANGE = "exchange"
    RTO = "rto"
    RETURN = "return"
    CANCELLED = "cancelled"
    LOST = "lost"
    SHIPPED = "shipped"
    UNKNOWN = "unknown"
