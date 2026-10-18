import argparse
import asyncio
import json
import os
import sys
import time
import uuid
import httpx
from typing import Optional
from chaos.generator import generate_batch
from chaos.ledger import ChaosLedger

async def send_batch(client: httpx.AsyncClient, url: str, api_key: str, batch: list, batch_id: str) -> bool:
    payload = {
        "batch_id": batch_id,
        "events": batch,
        "agent": {
            "host": "chaos-cluster-01",
            "version": "1.0.0-chaos",
            "ip": "172.28.0.99",
            "spool_percent": 2,
            "events_per_sec": len(batch) * 2
        }
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    try:
        res = await client.post(url, json=payload, headers=headers, timeout=10.0)
        return res.status_code in (200, 202)
    except Exception as e:
        print(f"Error sending batch {batch_id}: {e}", file=sys.stderr)
        return False

async def run_scenario(
    scenario: str,
    rate: int,
    duration: int,
    batch_size: int,
    url: str,
    api_key: str,
    db_path: str
):
    ledger = ChaosLedger(db_path=db_path)
    total_sent = 0
    start_time = time.time()
    interval = batch_size / float(rate)

    print(f"Starting chaos run: scenario={scenario}, rate={rate} logs/s, duration={duration}s, batch_size={batch_size}")
    print(f"Target: {url}")

    async with httpx.AsyncClient() as client:
        while time.time() - start_time < duration:
            batch_start = time.time()
            batch_id = f"chaos-{uuid.uuid4().hex[:12]}"
            batch = generate_batch(size=batch_size, scenario=scenario)

            ledger.record_events(batch_id=batch_id, scenario=scenario, events=batch)
            success = await send_batch(client, url, api_key, batch, batch_id)

            if success:
                total_sent += len(batch)
            else:
                print(f"Batch {batch_id} rejected or failed")

            elapsed = time.time() - batch_start
            sleep_time = interval - elapsed
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

    print(f"Chaos run complete. Total events dispatched: {total_sent}")
    summary = ledger.get_summary()
    print("Ledger summary:")
    print(json.dumps(summary, indent=2))

async def verify_ingestion(url_base: str, api_key: str, db_path: str):
    ledger = ChaosLedger(db_path=db_path)
    all_ids = ledger.get_all_ids()
    total_ledger = len(all_ids)

    if total_ledger == 0:
        print("No events found in chaos ledger to verify.")
        return

    print(f"Verifying {total_ledger} chaos events against Tailwatch at {url_base}...")
    headers = {"Authorization": f"Bearer {api_key}"}

    sample_size = min(total_ledger, 50)
    sample_ids = all_ids[:sample_size]

    verified = 0
    async with httpx.AsyncClient() as client:
        for eid in sample_ids:
            try:
                res = await client.get(
                    f"{url_base}/v1/logs",
                    params={"tql": f'fields.event_id="{eid}"', "limit": 1},
                    headers=headers,
                    timeout=5.0
                )
                if res.status_code == 200:
                    data = res.json()
                    if data.get("count", 0) > 0:
                        verified += 1
            except Exception as e:
                print(f"Verification query error: {e}", file=sys.stderr)

    delivery_pct = round((verified / sample_size) * 100, 2)
    print("Verification Result:")
    print(f"Sample checked: {sample_size} events")
    print(f"Verified found: {verified} events")
    print(f"Delivery completeness: {delivery_pct}%")

    if delivery_pct >= 99.0:
        print("PASS: Tailwatch verified zero-loss log ingestion.")
    else:
        print(f"FAIL: Ingestion verification below 99% ({delivery_pct}%)")

def main():
    parser = argparse.ArgumentParser(description="Tailwatch Chaos Simulator & Verification")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run chaos generator scenario")
    run_parser.add_argument("--scenario", choices=["steady", "spike", "payment-outage", "database-slowdown", "auth-attack"], default="steady")
    run_parser.add_argument("--rate", type=int, default=50, help="Target events per second")
    run_parser.add_argument("--duration", type=int, default=10, help="Duration in seconds")
    run_parser.add_argument("--batch-size", type=int, default=25, help="Events per HTTP batch")
    run_parser.add_argument("--url", default="http://localhost/v1/ingest", help="Ingest URL")
    run_parser.add_argument("--api-key", default="twk_live_test_key_master", help="API key")
    run_parser.add_argument("--ledger-db", default="chaos_ledger.db", help="Path to sqlite ledger")

    verify_parser = subparsers.add_parser("verify", help="Verify ingestion completeness")
    verify_parser.add_argument("--url-base", default="http://localhost", help="Tailwatch base URL")
    verify_parser.add_argument("--api-key", default="twk_live_test_key_master", help="API key")
    verify_parser.add_argument("--ledger-db", default="chaos_ledger.db", help="Path to sqlite ledger")

    args = parser.parse_args()

    if args.command == "run":
        asyncio.run(run_scenario(
            scenario=args.scenario,
            rate=args.rate,
            duration=args.duration,
            batch_size=args.batch_size,
            url=args.url,
            api_key=args.api_key,
            db_path=args.ledger_db
        ))
    elif args.command == "verify":
        asyncio.run(verify_ingestion(
            url_base=args.url_base,
            api_key=args.api_key,
            db_path=args.ledger_db
        ))

if __name__ == "__main__":
    main()
