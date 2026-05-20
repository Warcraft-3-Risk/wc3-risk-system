import { MAP_TYPE } from '../utils/map-info';
import { UNIT_TYPE } from '../utils/unit-types';
import { calculateWrappedYPosition } from '../utils/world-edge-transport-logic';

declare var gg_rct_WestEnter: rect;
declare var gg_rct_EastLeave: rect;
declare var gg_rct_EastEnter: rect;
declare var gg_rct_WestLeave: rect;

export function WorldEdgeTransportEvent() {
if (MAP_TYPE !== 'world') return;

// Make sure the regions exist (in case of tests or map edits)
if (typeof gg_rct_WestEnter === 'undefined' || typeof gg_rct_EastLeave === 'undefined' || typeof gg_rct_EastEnter === 'undefined' || typeof gg_rct_WestLeave === 'undefined') return;

const westEnterRegion = CreateRegion();
RegionAddRect(westEnterRegion, gg_rct_WestEnter);

const eastEnterRegion = CreateRegion();
RegionAddRect(eastEnterRegion, gg_rct_EastEnter);

const trigger = CreateTrigger();
TriggerRegisterEnterRegion(trigger, westEnterRegion, undefined);
TriggerRegisterEnterRegion(trigger, eastEnterRegion, undefined);

TriggerAddCondition(
trigger,
Condition(() => {
const triggerUnit = GetFilterUnit() || GetTriggerUnit();
if (!triggerUnit) return false;

// Only non-ship units
if (IsUnitType(triggerUnit, UNIT_TYPE.TRANSPORT)) return false;

return true;
})
);

TriggerAddAction(trigger, () => {
const u = GetTriggerUnit();
if (!u) return;

const triggeredRegion = GetTriggeringRegion();

const isWestEnter = triggeredRegion === westEnterRegion;
const enterRect = isWestEnter ? gg_rct_WestEnter : gg_rct_EastEnter;
const leaveRect = isWestEnter ? gg_rct_EastLeave : gg_rct_WestLeave;

const enteringY = GetUnitY(u);

const enterMinY = GetRectMinY(enterRect);
const enterMaxY = GetRectMaxY(enterRect);
const leaveMinY = GetRectMinY(leaveRect);
const leaveMaxY = GetRectMaxY(leaveRect);

const newY = calculateWrappedYPosition(enteringY, enterMinY, enterMaxY, leaveMinY, leaveMaxY);
const newX = GetRectCenterX(leaveRect); // Transport them to the center X of the leave region

SetUnitPosition(u, newX, newY);
});
}

