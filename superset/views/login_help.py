"""
Login help endpoint.

This module provides an endpoint to log login issues reported by the frontend.

Uses a Flask Blueprint rather than appbuilder.add_api because this endpoint must
be accessible to unauthenticated users who cannot log in.
"""

import logging

import requests
from flask import Blueprint, jsonify, request

from superset.superset_typing import FlaskResponse

logger = logging.getLogger(__name__)

login_help_blueprint = Blueprint("login_help", __name__)

MATTERMOST_WEBHOOK_URL = (
    "https://mattermost.teamraft.com/hooks/q7co9uqot7g398cnzg63kfxaay"
)


@login_help_blueprint.route("/api/v1/login/help", methods=["POST"])
def report_login_issue() -> FlaskResponse:
    """
    Log login issue from frontend.

    Logs the user details and issue information when users report login problems.
    Sends notification to Mattermost webhook.
    """
    data = request.get_json() or {}
    client_ip = data.get("ipAddress", "Unknown")
    user_timezone = data.get("timezone", "Unknown")
    local_time = data.get("localTime", "Unknown")
    name = data.get("name", "Unknown")
    email = data.get("email", "Unknown")
    message = data.get("message", "")

    logger.warning(
        "Login issue reported - Name: %s, Email: %s, IP: %s, Time: %s (%s), Message: %s",
        name,
        email,
        client_ip,
        local_time,
        user_timezone,
        message,
    )

    # Send to Mattermost webhook
    try:
        mattermost_payload = {
            "text": (
                f"🚨 **Login Issue Reported**\n"
                f"- **Name:** {name}\n"
                f"- **Email:** {email}\n"
                f"- **IP Address:** {client_ip}\n"
                f"- **Timezone:** {user_timezone}\n"
                f"- **Local Time:** {local_time}\n"
                f"- **Message:** {message or 'N/A'}"
            )
        }
        requests.post(MATTERMOST_WEBHOOK_URL, json=mattermost_payload, timeout=10)
    except Exception as e:
        logger.error("Failed to send Mattermost notification: %s", e)
        raise

    return jsonify({"logged": True})
