"""
Elexon BMRS Data Ingestion Script for January 2026
Datasets:
  - FUELHH (fuelType == 'WIND'): Actual half-hourly wind generation
  - WINDFOR: Half-hourly forecasted wind generation with publishTime
"""
import os
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "elexon_wind_jan2026.db")

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"

def init_db(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS actual_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            startTime TEXT NOT NULL,
            publishTime TEXT,
            settlementDate TEXT,
            settlementPeriod INTEGER,
            generation REAL NOT NULL,
            UNIQUE(startTime)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS forecast_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            startTime TEXT NOT NULL,
            publishTime TEXT NOT NULL,
            generation REAL NOT NULL,
            UNIQUE(startTime, publishTime)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_start ON actual_generation(startTime)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_actual_date ON actual_generation(settlementDate)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_start ON forecast_generation(startTime)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecast_pub ON forecast_generation(publishTime)")
    conn.commit()

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "UK-DayAhead-EnergyApp/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return []

def ingest_actuals(conn, start_date=datetime(2026, 1, 1), end_date=datetime(2026, 2, 1)):
    print(f"--- Ingesting FUELHH (Actual Wind Generation) {start_date.date()} to {end_date.date()} ---")
    current = start_date
    cursor = conn.cursor()
    total_inserted = 0

    while current < end_date:
        next_chunk = min(current + timedelta(days=5), end_date)
        from_str = current.strftime("%Y-%m-%dT00:00:00Z")
        to_str = next_chunk.strftime("%Y-%m-%dT00:00:00Z")
        url = f"{BASE_URL}/FUELHH/stream?publishDateTimeFrom={from_str}&publishDateTimeTo={to_str}"
        print(f"Fetching FUELHH: {from_str} -> {to_str}")
        items = fetch_json(url)
        wind_items = [item for item in items if item.get("fuelType") == "WIND"]
        
        batch = []
        for w in wind_items:
            start_time = w.get("startTime")
            pub_time = w.get("publishTime")
            settlement_date = w.get("settlementDate")
            settlement_period = w.get("settlementPeriod")
            gen = w.get("generation")
            if start_time and gen is not None:
                batch.append((start_time, pub_time, settlement_date, settlement_period, float(gen)))

        cursor.executemany("""
            INSERT OR REPLACE INTO actual_generation (startTime, publishTime, settlementDate, settlementPeriod, generation)
            VALUES (?, ?, ?, ?, ?)
        """, batch)
        conn.commit()
        total_inserted += len(batch)
        print(f"  Inserted/Updated {len(batch)} records (Total so far: {total_inserted})")
        current = next_chunk

    print(f"Finished FUELHH ingestion: {total_inserted} records.\n")

def ingest_forecasts(conn, start_date=datetime(2025, 12, 30), end_date=datetime(2026, 2, 1)):
    print(f"--- Ingesting WINDFOR (Forecast Generation) {start_date.date()} to {end_date.date()} ---")
    current = start_date
    cursor = conn.cursor()
    total_inserted = 0

    while current < end_date:
        next_chunk = min(current + timedelta(days=4), end_date)
        from_str = current.strftime("%Y-%m-%dT00:00:00Z")
        to_str = next_chunk.strftime("%Y-%m-%dT00:00:00Z")
        url = f"{BASE_URL}/WINDFOR/stream?publishDateTimeFrom={from_str}&publishDateTimeTo={to_str}"
        print(f"Fetching WINDFOR: {from_str} -> {to_str}")
        items = fetch_json(url)
        
        batch = []
        for f in items:
            start_time = f.get("startTime")
            pub_time = f.get("publishTime")
            gen = f.get("generation")
            if start_time and pub_time and gen is not None:
                batch.append((start_time, pub_time, float(gen)))

        cursor.executemany("""
            INSERT OR REPLACE INTO forecast_generation (startTime, publishTime, generation)
            VALUES (?, ?, ?)
        """, batch)
        conn.commit()
        total_inserted += len(batch)
        print(f"  Inserted/Updated {len(batch)} records (Total so far: {total_inserted})")
        current = next_chunk

    print(f"Finished WINDFOR ingestion: {total_inserted} records.\n")

def export_summary(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT count(*), min(startTime), max(startTime) FROM actual_generation")
    act_count, act_min, act_max = cursor.fetchone()
    cursor.execute("SELECT count(*), min(publishTime), max(publishTime) FROM forecast_generation")
    fc_count, fc_min, fc_max = cursor.fetchone()
    print("Database Summary:")
    print(f"  Actual Generation: {act_count} records (From {act_min} to {act_max})")
    print(f"  Forecast Generation: {fc_count} records (Publish from {fc_min} to {fc_max})")

if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    ingest_actuals(conn)
    ingest_forecasts(conn)
    export_summary(conn)
    conn.close()
