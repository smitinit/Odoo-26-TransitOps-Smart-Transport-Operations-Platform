from sqlalchemy import event
from sqlalchemy.orm import Mapper, Session
from sqlalchemy.engine import Connection
from app.shared.base.model import BaseModel
from app.modules.audit.models import AuditLog
from datetime import datetime
from uuid import UUID

def default_serializer(obj):
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

def _create_audit_log(mapper: Mapper, connection: Connection, target: BaseModel, action: str):
    if target.__tablename__ == 'audit_logs':
        return
        
    state = getattr(target, '_sa_instance_state')
    
    old_data = {}
    new_data = {}
    
    if action == 'UPDATE':
        for attr in state.attrs:
            history = attr.history
            if history.has_changes():
                old_data[attr.key] = default_serializer(history.deleted[0]) if history.deleted else None
                new_data[attr.key] = default_serializer(history.added[0]) if history.added else None
    elif action == 'CREATE':
        for attr in state.attrs:
            new_data[attr.key] = default_serializer(attr.value)
    elif action == 'DELETE':
        for attr in state.attrs:
            old_data[attr.key] = default_serializer(attr.value)

    # Note: user_id would typically come from context variables in a real request
    # For now, it's left None or can be wired up via request context.
    connection.execute(
        AuditLog.__table__.insert().values(
            id=target.id, # We would normally generate a new UUID for the audit log itself
            action=action,
            table_name=target.__tablename__,
            record_id=str(target.id),
            old_data=old_data if old_data else None,
            new_data=new_data if new_data else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    )

def setup_audit_events():
    @event.listens_for(BaseModel, 'after_insert', propagate=True)
    def receive_after_insert(mapper, connection, target):
        _create_audit_log(mapper, connection, target, 'CREATE')

    @event.listens_for(BaseModel, 'after_update', propagate=True)
    def receive_after_update(mapper, connection, target):
        _create_audit_log(mapper, connection, target, 'UPDATE')

    @event.listens_for(BaseModel, 'after_delete', propagate=True)
    def receive_after_delete(mapper, connection, target):
        _create_audit_log(mapper, connection, target, 'DELETE')
