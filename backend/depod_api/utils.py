from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        # Fallback unhandled errors
        return Response({
            'message': 'Server error',
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = response.data

    # Normalize DRF validation errors to { message, errors }
    errors = None
    message = None

    if isinstance(data, dict):
        # DRF ValidationError likely a dict of field -> [errors]
        if 'detail' in data and len(data) == 1:
            message = data.get('detail')
        else:
            # Collect field errors
            errors = {}
            for key, val in data.items():
                if key == 'non_field_errors':
                    message = ', '.join([str(v) for v in val]) if isinstance(val, (list, tuple)) else str(val)
                else:
                    if isinstance(val, (list, tuple)):
                        errors[key] = [str(v) for v in val]
                    else:
                        errors[key] = [str(val)]
    elif isinstance(data, list):
        message = ', '.join([str(v) for v in data])

    body = {'message': message or 'Validation error'}
    if errors:
        body['errors'] = errors

    response.data = body
    return response
