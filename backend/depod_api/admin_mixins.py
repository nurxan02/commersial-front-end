from django.db import models
try:
    # Unfold WYSIWYG widget
    from unfold.contrib.forms.widgets import WysiwygWidget
except Exception:  # pragma: no cover
    WysiwygWidget = None


class RichTextAdminMixin:
    """Applies WysiwygWidget to all TextField form fields in Django admin."""

    # formfield_overrides works for ModelAdmin and InlineModelAdmin
    formfield_overrides = (
        {models.TextField: {"widget": WysiwygWidget}} if WysiwygWidget else {}
    )


class RichTextTabularInlineMixin:
    """Inline variant of the mixin for TabularInline/StackedInline."""

    formfield_overrides = (
        {models.TextField: {"widget": WysiwygWidget}} if WysiwygWidget else {}
    )
