import base64
import logging

import requests
from flask import current_app

from superset.reports.models import ReportRecipientType
from superset.reports.notifications.base import BaseNotification
from superset.reports.notifications.exceptions import (
    NotificationParamException,
    NotificationUnprocessableException,
)
from superset.reports.notifications.slack_mixin import SlackMixin
from superset.utils import json

logger = logging.getLogger(__name__)


class MattermostNotification(SlackMixin, BaseNotification):
    """
    Sends a notification to Mattermost via incoming webhook.
    Embeds screenshots as inline base64 images.
    """

    type = ReportRecipientType.MATTERMOST

    def _get_inline_image(self) -> str | None:
        """Get the first available image as a base64 data URI."""
        if self._content.screenshots:
            b64 = base64.b64encode(self._content.screenshots[0]).decode()
            return f"data:image/png;base64,{b64}"
        if self._content.pdf:
            # PDF is built from screenshots — encode it as-is
            # Mattermost won't render PDF inline, but we can try
            # converting via the first page if possible
            try:
                from superset.utils.pdf import build_pdf_from_screenshots  # noqa

                # The PDF bytes are already built, no way to reverse easily.
                # Just skip image for PDF format — text + link is sent.
                return None
            except ImportError:
                return None
        return None

    def send(self) -> None:
        webhook_url = current_app.config.get("MATTERMOST_WEBHOOK_URL")
        if not webhook_url:
            raise NotificationParamException(
                "MATTERMOST_WEBHOOK_URL is not configured in superset_config"
            )

        body = self._get_body(content=self._content)
        image_uri = self._get_inline_image()

        if not image_uri and self._content.screenshots:
            raise NotificationUnprocessableException(
                "Failed to encode screenshot for Mattermost"
            )

        if image_uri:
            body += f"\n\n![report screenshot]({image_uri})"

        logger.info(
            "[MATTERMOST DEBUG] screenshots=%s pdf=%s csv=%s text=%s body_len=%d",
            len(self._content.screenshots) if self._content.screenshots else 0,
            len(self._content.pdf) if self._content.pdf else 0,
            len(self._content.csv) if self._content.csv else 0,
            bool(self._content.text),
            len(body),
        )
        logger.info("[MATTERMOST DEBUG] body=%s", body[:500])

        # Save files to /tmp
        if self._content.screenshots:
            for i, img in enumerate(self._content.screenshots):
                with open(f"/tmp/mattermost_screenshot_{i}.png", "wb") as f:
                    f.write(img)
                logger.info("[MATTERMOST DEBUG] Saved screenshot %d (%d bytes)", i, len(img))
        if self._content.pdf:
            with open("/tmp/mattermost_report.pdf", "wb") as f:
                f.write(self._content.pdf)
            logger.info("[MATTERMOST DEBUG] Saved PDF (%d bytes)", len(self._content.pdf))

        payload: dict = {"text": body}

        try:
            resp = requests.post(webhook_url, json=payload, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.RequestException as ex:
            raise NotificationUnprocessableException(
                f"Failed to send Mattermost notification: {ex}"
            ) from ex

        logger.info("Report sent to Mattermost")
