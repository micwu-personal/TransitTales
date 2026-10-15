"""Build original complete-sentence recordings from the curated public network."""
import hashlib


def build_catalog(network, copy):
    templates = copy["templates"]
    names = copy["spokenLines"]
    if set(names) != {line["id"] for line in network["lines"]}:
        raise RuntimeError("Mandarin spoken services must match the real network")
    scripts = {}
    contexts = {}

    def add(key, template, **values):
        text = templates[template].format(**values)
        relative = "mandarin/" + hashlib.sha256(text.encode("utf-8")).hexdigest()[:24]
        if relative in scripts and scripts[relative] != text:
            raise RuntimeError("Mandarin recording ID collision")
        scripts[relative] = text
        contexts[key] = relative

    for kind in ["ready", "boarding", "transfer", "complete"]:
        add(kind, kind)
    for line in network["lines"]:
        template = "boardingThrough" if line["id"] in ["1-batong", "4-daxing"] else "boardingLine"
        add(f"boarding|{line['id']}", template, line=names[line["id"]])
        add(f"transfer|{line['id']}", "transferLine", line=names[line["id"]])
    for station in network["stations"]:
        identity = station["name"] if station["name"].endswith("站") else station["name"] + "站"
        for kind in ["ride", "arrival", "walk"]:
            add(f"{kind}|{station['id']}", kind, station=identity)
        services = [line for line in network["lines"] if station["id"] in line["stops"]]
        for incoming in services:
            others = []
            seen = {incoming.get("serviceGroup", incoming["id"])}
            for connection in services:
                group = connection.get("serviceGroup", connection["id"])
                if group not in seen:
                    others.append(names[connection["id"]])
                    seen.add(group)
            key = f"ride|{station['id']}|{incoming['id']}"
            if others:
                add(key, "rideTransfer", station=identity, connections="、".join(others))
            else:
                contexts[key] = contexts[f"ride|{station['id']}"]
    return {"version": 1, "contexts": dict(sorted(contexts.items())), "scripts": dict(sorted(scripts.items()))}
