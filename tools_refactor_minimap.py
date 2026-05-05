import re
import sys

def modify():
    with open("src/app/managers/minimap-icon-manager.ts", "r", encoding="utf-8") as f:
        content = f.read()

    # Add import
    import_stmt = "import { MinimapTrackedList } from '../utils/minimap-tracked-list-logic';\n"
    content = content.replace("import { Wait } from '../utils/wait';\n", "import { Wait } from '../utils/wait';\n" + import_stmt)

    # Replace local arrays with MinimapTrackedList
    content = content.replace(
        "private trackedUnitList: unit[] = [];\n        private trackedFrameList: framehandle[] = [];\n        private trackedRawOwnerList: player[] = []; // Caches raw owner per unit for dirty checking\n        private trackedUnitIndex: Map<unit, number> = new Map();",
        "private trackedList = new MinimapTrackedList<unit, framehandle, player>();"
    )

    # Remove addTrackedUnit and removeTrackedAt methods
    
    # We'll use regex to chop them out.
    content = re.sub(r"\s+private addTrackedUnit\(unit: unit, frame: framehandle\): void \{[\s\S]+?\}\n", "\n", content)
    content = re.sub(r"\s+private removeTrackedAt\(index: number\): framehandle \| undefined \{[\s\S]+?return frame;\n        \}\n", "\n", content)
    
    # Check `this.trackedUnitList`, `this.trackedFrameList`, `this.trackedRawOwnerList`, `this.trackedUnitIndex` and replace with `this.trackedList.*`
    content = content.replace("this.trackedUnitList", "this.trackedList.trackedUnitList")
    content = content.replace("this.trackedFrameList", "this.trackedList.trackedFrameList")
    content = content.replace("this.trackedRawOwnerList", "this.trackedList.trackedRawOwnerList")
    content = content.replace("this.trackedUnitIndex", "this.trackedList.trackedUnitIndex")

    # Replace specific calls inside registerTrackedUnit and removeTrackedAt
    content = content.replace("this.addTrackedUnit(unit, iconFrame);", "this.trackedList.addTrackedUnit(unit, iconFrame, GetOwningPlayer(unit));")
    
    content = content.replace("const iconFrame = this.removeTrackedAt(index);", "const iconFrame = this.trackedList.removeTrackedAt(index);")
    content = content.replace("const frame = this.removeTrackedAt(i);", "const frame = this.trackedList.removeTrackedAt(i);")
    
    # Inside clear/stop tracking
    content = content.replace(
        "this.trackedList.trackedUnitList.length = 0;\n                this.trackedList.trackedFrameList.length = 0;\n                this.trackedList.trackedUnitIndex.clear();",
        "this.trackedList.clear();"
    )
    
    with open("src/app/managers/minimap-icon-manager.ts", "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    modify()
