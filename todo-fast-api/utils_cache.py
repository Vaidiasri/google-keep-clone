from datetime import datetime, timedelta
import threading


class SimpleCache:
    def __init__(self):
        self._cache = {}
        self._lock = threading.Lock()

    def get(self, key: str):
        with self._lock:
            data = self._cache.get(key)
            if not data:
                return None

            if datetime.utcnow() > data["expiry"]:
                del self._cache[key]
                return None

            return data["value"]

    def set(self, key: str, value: any, ttl_seconds: int = 60):
        with self._lock:
            expiry = datetime.utcnow() + timedelta(seconds=ttl_seconds)
            self._cache[key] = {"value": value, "expiry": expiry}

    def delete(self, key: str):
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def clear_all(self):
        with self._lock:
            self._cache.clear()


# Global Cache Instance
cache = SimpleCache()
