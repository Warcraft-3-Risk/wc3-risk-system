if Debug then Debug.beginFile "HandleRecycler" end
do
    ---------------------------------------------------------------------
    --Location Recycler
    ---------------------------------------------------------------------
    local unusedLocations = {}
    local unpooledLocations = {}
    local isUnused = {}

    local LOCATION_RETURNING_NATIVES = {
        GetStartLocationLoc = true,
        GetOrderPointLoc = true,
        GetSpellTargetLoc = true,
        GetUnitLoc = true,
        CameraSetupGetDestPositionLoc = true,
        GetCameraTargetPositionLoc = true,
        GetCameraEyePositionLoc = true,
    }

    local oldLocation = Location
    function Location(x, y)
        local numUnusedLocations = #unusedLocations
        if numUnusedLocations == 0 then
            return oldLocation(x, y)
        else
            local returnLoc = unusedLocations[numUnusedLocations]
            unusedLocations[numUnusedLocations] = nil
            isUnused[returnLoc] = nil
            MoveLocation(returnLoc, x, y)
            return returnLoc
        end
    end

    local oldRemoveLocation = RemoveLocation
    function RemoveLocation(whichLocation)
        if unpooledLocations[whichLocation] then
            oldRemoveLocation(whichLocation)
            unpooledLocations[whichLocation] = nil
        elseif isUnused[whichLocation] then
            print("|cffff0000Warning:|r HandleRecycler: Double deletion of location.")
            if Debug then
                print(Debug.traceback())
            end
        else
            unusedLocations[#unusedLocations + 1] = whichLocation
            isUnused[whichLocation] = true
        end
    end

    for name, __ in pairs(LOCATION_RETURNING_NATIVES) do
        local getX = _G[name:gsub("Loc", "X")]
        local getY = _G[name:gsub("Loc", "Y")]
        _G[name] = function(...)
            local x = getX(...)
            local y = getY(...)
            return Location(x, y)
        end
    end

    function BlzGetTriggerPlayerMousePosition()
        local x = BlzGetTriggerPlayerMouseX()
        local y = BlzGetTriggerPlayerMouseY()
        return Location(x, y)
    end

    local oldRallyPoint = GetUnitRallyPoint
    function GetUnitRallyPoint(whichUnit)
        local loc = oldRallyPoint(whichUnit)
        if loc ~= nil then
            unpooledLocations[loc] = true
        end
        return loc
    end

    ---------------------------------------------------------------------
    --Group Recycler
    ---------------------------------------------------------------------

    local unusedGroups = {}

    local oldCreateGroup = CreateGroup
    function CreateGroup()
        local numUnusedGroups = #unusedGroups
        if numUnusedGroups == 0 then
            return oldCreateGroup()
        else
            local returnGroup = unusedGroups[numUnusedGroups]
            unusedGroups[numUnusedGroups] = nil
            isUnused[returnGroup] = nil
            GroupClear(returnGroup)
            return returnGroup
        end
    end

    function DestroyGroup(whichGroup)
        if isUnused[whichGroup] then
            print("|cffff0000Warning:|r HandleRecycler: Double deletion of group.")
            if Debug then
                print(Debug.traceback())
            end
        else
            unusedGroups[#unusedGroups + 1] = whichGroup
            isUnused[whichGroup] = true
        end
    end

    ---------------------------------------------------------------------
    --Rect Recycler
    ---------------------------------------------------------------------

    local unusedRects = {}

    local oldRect = Rect
    function Rect(minx, miny, maxx, maxy)
        local numUnusedRects = #unusedRects
        if numUnusedRects == 0 then
            return oldRect(minx, miny, maxx, maxy)
        else
            local returnRect = unusedRects[numUnusedRects]
            unusedRects[numUnusedRects] = nil
            isUnused[returnRect] = nil
            SetRect(returnRect, minx, miny, maxx, maxy)
            return returnRect
        end
    end

    local oldRectFromLoc = RectFromLoc
    function RectFromLoc(min, max)
        local numUnusedRects = #unusedRects
        if numUnusedRects == 0 then
            return oldRectFromLoc()
        else
            local returnRect = unusedRects[numUnusedRects]
            unusedRects[numUnusedRects] = nil
            isUnused[returnRect] = nil
            SetRect(returnRect, GetLocationX(min), GetLocationY(min), GetLocationX(max), GetLocationY(max))
            return returnRect
        end
    end

    function RemoveRect(whichRect)
        if isUnused[whichRect] then
            print("|cffff0000Warning:|r HandleRecycler: Double deletion of rect.")
            if Debug then
                print(Debug.traceback())
            end
        else
            unusedRects[#unusedRects + 1] = whichRect
            isUnused[whichRect] = true
        end
    end
end
if Debug then Debug.endFile() end