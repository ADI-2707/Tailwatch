import uuid
import random
from datetime import datetime, timezone
from typing import Dict, Any, List

SERVICES = ["shop-web", "shop-payment", "shop-inventory", "shop-auth", "shop-worker"]

HTTP_PATHS = [
    "/api/v1/cart",
    "/api/v1/checkout",
    "/api/v1/products",
    "/api/v1/users/login",
    "/api/v1/inventory/check",
    "/healthz"
]

def generate_log_event(scenario: str = "steady") -> Dict[str, Any]:
    event_id = str(uuid.uuid4())
    trace_id = uuid.uuid4().hex
    span_id = uuid.uuid4().hex[:16]
    now_iso = datetime.now(timezone.utc).isoformat()

    if scenario == "payment-outage":
        service = "shop-payment"
        level = random.choices(["error", "fatal", "warn", "info"], weights=[60, 20, 15, 5])[0]
        if level in ("error", "fatal"):
            message = "Connection timeout while calling payment gateway https://api.stripe.com/v1/charges"
            fields = {
                "event_id": event_id,
                "trace_id": trace_id,
                "span_id": span_id,
                "path": "/api/v1/checkout",
                "method": "POST",
                "status_code": 504,
                "latency_ms": random.randint(5000, 15000),
                "error_code": "GATEWAY_TIMEOUT",
                "stack_trace": "TimeoutError: Request to payment processor timed out after 10000ms\n  at PaymentClient.process (payment.js:84:11)\n  at CheckoutHandler.execute (checkout.js:142:9)"
            }
        else:
            message = "Payment retry attempt queued"
            fields = {
                "event_id": event_id,
                "trace_id": trace_id,
                "span_id": span_id,
                "retry_count": 2,
                "status_code": 429
            }

    elif scenario == "database-slowdown":
        service = "shop-inventory"
        latency = random.randint(2500, 6000)
        level = "warn" if latency > 3000 else "info"
        message = f"Slow query detected on inventory_items table: took {latency}ms"
        fields = {
            "event_id": event_id,
            "trace_id": trace_id,
            "span_id": span_id,
            "query": "SELECT * FROM inventory_items WHERE sku = ? FOR UPDATE",
            "latency_ms": latency,
            "db_connections_busy": random.randint(45, 50),
            "db_connections_max": 50
        }

    elif scenario == "auth-attack":
        service = "shop-auth"
        level = "warn"
        message = f"Failed authentication attempt for user admin_{random.randint(100, 999)}@corp.internal"
        fields = {
            "event_id": event_id,
            "trace_id": trace_id,
            "span_id": span_id,
            "path": "/api/v1/users/login",
            "method": "POST",
            "status_code": 401,
            "client_ip": f"198.51.100.{random.randint(1, 254)}",
            "user_agent": "Hydra/9.5 (Kali Linux Brute Force Scanner)"
        }

    elif scenario == "spike":
        service = random.choice(SERVICES)
        level = random.choices(["info", "warn", "error"], weights=[90, 8, 2])[0]
        path = random.choice(HTTP_PATHS)
        message = f"HTTP {random.choice(['GET', 'POST'])} {path} completed with high concurrency"
        fields = {
            "event_id": event_id,
            "trace_id": trace_id,
            "span_id": span_id,
            "path": path,
            "status_code": 200 if level == "info" else 500,
            "latency_ms": random.randint(10, 400),
            "active_sessions": random.randint(5000, 15000)
        }

    else:
        service = random.choice(SERVICES)
        level = random.choices(["info", "debug", "warn", "error"], weights=[70, 20, 8, 2])[0]
        path = random.choice(HTTP_PATHS)
        status_code = 200 if level in ("info", "debug") else (404 if level == "warn" else 500)
        message = f"Handled request {path} with status {status_code}"
        fields = {
            "event_id": event_id,
            "trace_id": trace_id,
            "span_id": span_id,
            "path": path,
            "status_code": status_code,
            "latency_ms": random.randint(5, 120),
            "user_id": f"usr_{random.randint(1000, 9999)}"
        }

    return {
        "ts": now_iso,
        "level": level,
        "service": service,
        "message": message,
        "fields": fields
    }

def generate_batch(size: int = 50, scenario: str = "steady") -> List[Dict[str, Any]]:
    return [generate_log_event(scenario=scenario) for _ in range(size)]
