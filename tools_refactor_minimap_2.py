import re
with open("src/app/managers/minimap-icon-manager.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r"private trackedUnitList: unit\[\] = \[\];\s+private trackedFrameList: framehandle\[\] = \[\];\s+private trackedRawOwnerList: player\[\] = \[\];[^\n]+\n\s+private trackedUnitIndex: Map<unit, number> = new Map\(\);", "public trackedList = new MinimapTrackedList<unit, framehandle, player>();", content)

with open("src/app/managers/minimap-icon-manager.ts", "w", encoding="utf-8") as f:
    f.write(content)
