"""Base schema for DART map layer configuration validation."""

from marshmallow import post_dump, Schema


class BaseDartLayerSchema(Schema):
    """Base schema for DART map layers with common serialization behavior.

    All DartLayer schema versions should inherit from this class to ensure
    consistent serialization behavior, including automatic removal of null
    values from the output.
    """

    @post_dump
    def remove_none_values(self, data, **kwargs):
        """Recursively remove keys with None values from serialized output."""

        def remove_nulls(obj):
            if isinstance(obj, dict):
                return {k: remove_nulls(v) for k, v in obj.items() if v is not None}
            if isinstance(obj, list):
                return [remove_nulls(item) for item in obj]
            return obj

        return remove_nulls(data)
