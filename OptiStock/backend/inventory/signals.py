import json
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from .models import Notification

EVENT_MODELS = {'Product', 'Category', 'Supplier', 'StockLedger', 'Notification'}


def get_obj_name(instance):
    for attr in ['name', 'company_name', 'title', 'product_name']:
        val = getattr(instance, attr, None)
        if val:
            return str(val)
    return str(instance)


ACTION_LABELS = {
    'created': 'created',
    'updated': 'updated',
    'deleted': 'deleted',
}

NOTIFICATION_TYPE_MAP = {
    'Product': 'info',
    'Category': 'info',
    'Supplier': 'info',
    'StockLedger': 'stock_log',
    'Notification': 'info',
}

NOTIFICATION_TITLE_MAP = {
    'Product': 'Product',
    'Category': 'Category',
    'Supplier': 'Supplier',
    'StockLedger': 'Stock Adjustment',
    'Notification': 'Notification',
}


def create_notification_record(model_name, action, instance):
    name = get_obj_name(instance) if instance else ''
    label = ACTION_LABELS.get(action, action)
    entity_label = NOTIFICATION_TITLE_MAP.get(model_name, model_name)
    notif_type = NOTIFICATION_TYPE_MAP.get(model_name, 'info')

    if model_name == 'StockLedger':
        title = f'Stock {label}'
        description = f'Stock updated: {name or "adjustment recorded"}'
    else:
        title = f'{entity_label} {label}'
        description = f'{entity_label} "{name}" has been {label}.'

    Notification.objects.create(
        title=title,
        description=description,
        type=notif_type,
        related_entity=model_name,
        related_id=str(instance.pk) if instance and instance.pk else None,
    )


def broadcast_event(model_name, action, instance):
    channel_layer = get_channel_layer()
    data = {
        'model': model_name,
        'action': action,
        'id': str(instance.pk) if instance and instance.pk else None,
        'name': get_obj_name(instance) if instance else None,
        'timestamp': timezone.now().isoformat(),
    }
    if model_name == 'Notification' and instance:
        data.update({
            'title': instance.title,
            'description': instance.description,
            'type': instance.type,
            'is_read': instance.is_read,
            'created_at': instance.created_at.isoformat() if instance.created_at else None,
            'related_entity': instance.related_entity,
            'related_id': instance.related_id,
        })
    async_to_sync(channel_layer.group_send)(
        'events',
        {'type': 'event_message', 'data': data},
    )


@receiver(post_save)
def model_saved(sender, **kwargs):
    name = sender.__name__
    if name in EVENT_MODELS:
        action = 'created' if kwargs.get('created') else 'updated'
        instance = kwargs.get('instance')
        broadcast_event(name, action, instance)
        if name != 'Notification':
            create_notification_record(name, action, instance)


@receiver(post_delete)
def model_deleted(sender, **kwargs):
    name = sender.__name__
    if name in EVENT_MODELS:
        instance = kwargs.get('instance')
        broadcast_event(name, 'deleted', instance)
        if name != 'Notification':
            create_notification_record(name, 'deleted', instance)
