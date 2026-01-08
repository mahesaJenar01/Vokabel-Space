# quick_script.py

import json
from pathlib import Path

def main():
    json_path = Path("backend/data/library.json")

    if not json_path.exists():
        raise FileNotFoundError(f"File not found: {json_path}")

    with json_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # Determine what "properties" means based on JSON structure
    if isinstance(data, dict):
        properties = list(data.keys())
    elif isinstance(data, list):
        properties = data
    else:
        raise TypeError("Unsupported JSON structure. Expected object or array.")

    for index in range(0, len(properties), 10):
        group_number = (index // 10) + 1
        group = properties[index:index + 10]
        print(f"{group_number}. {', '.join(map(str, group))}")

if __name__ == "__main__":
    main()