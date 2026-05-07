if Debug then Debug.beginFile "FastWorld2ScreenTransform" end
do
    --[[
    =============================================================================================================================================================
                                                              Fast World2Screen Transform
                                                                      by Antares

                                                Transform from world to screen coordinates and back.
						
								Requires:
								TotalInitialization			    https://www.hiveworkshop.com/threads/.317099/
                                PrecomputedHeightMap (optional) https://www.hiveworkshop.com/threads/.353477/

    =============================================================================================================================================================
                                                                           A P I
    =============================================================================================================================================================

    World2Screen(x, y, z, player)                       Takes the world coordinates x, y, and z and returns the screen positions x and y of that point on the
                                                        specified player's screen. The third return value specifies if the point is on the screen.
    Screen2World(x, y, player)                          Takes the screen coordinates x and y and the player for which the calculation should be performed and
                                                        returns the x, y, and z world coordinates. The fourth return value specifies whether or not the search for
                                                        the world intersection point converged. This function may fail when a ray pointing from the camera to the
                                                        world intersects at multiple points with the terrain.

    =============================================================================================================================================================
																	    C O N F I G
    =============================================================================================================================================================
    ]]

    --The interval between updates of each player's camera parameters.
    local TIME_STEP                             = 0.02          ---@type number

    --[[
    =============================================================================================================================================================
                                                                  E N D   O F   C O N F I G
    =============================================================================================================================================================
    ]]

    local cos = math.cos
    local sin = math.sin
    local sqrt = math.sqrt

    local preCalc                               = false         ---@type boolean
    local eyeX                                  = 0             ---@type number
    local eyeY                                  = 0             ---@type number
    local eyeZ                                  = 0             ---@type number
    local cosRot                                = 0             ---@type number
    local sinRot                                = 0             ---@type number
    local cosAttack                             = 0             ---@type number
    local sinAttack                             = 0             ---@type number
    local angleOfAttack                         = 0             ---@type number
    local rotation                              = 0             ---@type number
    local cosAttackCosRot                       = 0             ---@type number
    local cosAttackSinRot                       = 0             ---@type number
    local sinAttackCosRot                       = 0             ---@type number
    local sinAttackSinRot                       = 0             ---@type number
    local yCenterScreenShift                    = 0             ---@type number
    local scaleFactor                           = 0             ---@type number

    local GetTerrainZ                                           ---@type function
    local moveableLoc                                           ---@type location

    local function CameraPrecalc(player)
        eyeX = GetCameraEyePositionX()
        eyeY = GetCameraEyePositionY()
        eyeZ = GetCameraEyePositionZ()
        angleOfAttack = GetCameraField(CAMERA_FIELD_ANGLE_OF_ATTACK)
        rotation = GetCameraField(CAMERA_FIELD_ROTATION)
        local fieldOfView = GetCameraField(CAMERA_FIELD_FIELD_OF_VIEW)

		cosAttack = cos(angleOfAttack)
        sinAttack = sin(angleOfAttack)
        cosRot = cos(rotation)
        sinRot = sin(rotation)
        yCenterScreenShift = 0.1284*cosAttack
        scaleFactor = 0.0524*fieldOfView^3 - 0.0283*fieldOfView^2 + 1.061*fieldOfView

        cosAttackCosRot = cosAttack*cosRot
        cosAttackSinRot = cosAttack*sinRot
        sinAttackCosRot = sinAttack*cosRot
        sinAttackSinRot = sinAttack*sinRot

        preCalc = true
    end

    ---Takes the world coordinates x, y, and z and returns the screen positions x and y of that point on the specified player's screen. The third return value specifies if the point is on the screen.
    ---@param x number
    ---@param y number
    ---@param z number
    ---@return number, number, boolean
    function World2Screen(x, y, z)
        if not preCalc then
            CameraPrecalc()
        end

        local dx = x - eyeX
        local dy = y - eyeY
        local dz = z - eyeZ

        local xPrime = scaleFactor*(-cosAttackCosRot*dx - cosAttackSinRot*dy - sinAttack*dz)

        local xs = 0.4 + (cosRot*dy - sinRot*dx)/xPrime
        local ys = 0.42625 - yCenterScreenShift + (sinAttackCosRot*dx + sinAttackSinRot*dy - cosAttack*dz)/xPrime

        return xs, ys, xPrime < 0 and xs > -0.1333 and xs < 0.9333 and ys > 0 and ys < 0.6
    end

    ---Takes the screen coordinates x and y and the player for which the calculation should be performed and returns the x, y, and z world coordinates. The fourth return value specifies whether or not the search for the world intersection point converged. This function may fail when a ray pointing from the camera to the world intersects at multiple points with the terrain.
    ---@param x number
    ---@param y number
    ---@return number, number, number, boolean
    function Screen2World(x, y)
        if not preCalc then
            CameraPrecalc()
        end

        local a = (x - 0.4)*scaleFactor
        local b = (0.42625 - yCenterScreenShift - y)*scaleFactor

        --This is the unit vector pointing towards the mouse cursor in the camera's coordinate system.
        local nx = 1/sqrt(1 + a*a + b*b)
        local ny = sqrt(1 - (1 + b*b)*nx*nx)
        local nz = sqrt(1 - nx*nx - ny*ny)
        if a > 0 then
            ny = -ny
        end
        if b < 0 then
            nz = -nz
        end

        --Constructs the unit vector pointing from the camera eye position to the mouse cursor.
		local nxPrime = cosAttackCosRot*nx - sinRot*ny + sinAttackCosRot*nz
		local nyPrime = cosAttackSinRot*nx + cosRot*ny + sinAttackSinRot*nz
		local nzPrime = -sinAttack*nx + cosAttack*nz

        --Try to find intersection point of vector with terrain.
        local zGuess = GetTerrainZ(eyeX, eyeY)
        local xGuess = eyeX + nxPrime*(eyeZ - zGuess)/nzPrime
        local yGuess = eyeY + nyPrime*(eyeZ - zGuess)/nzPrime
        local zWorld = GetTerrainZ(xGuess, yGuess)
        local deltaZ = zWorld - zGuess
        zGuess = zWorld

        local zWorldOld, deltaZOld
        local i = 0

        while (deltaZ > 1 or deltaZ < -1) and i < 50 do
            zWorldOld = zWorld
            deltaZOld = deltaZ

            xGuess = eyeX + nxPrime*(eyeZ - zGuess)/nzPrime
            yGuess = eyeY + nyPrime*(eyeZ - zGuess)/nzPrime

            zWorld = GetTerrainZ(xGuess, yGuess)
            deltaZ = zWorld - zGuess
            zGuess = (deltaZOld*zWorld - deltaZ*zWorldOld)/(deltaZOld - deltaZ)
            i = i + 1
        end

        return xGuess, yGuess, zWorld, i < 50
    end

    OnInit.final("World2Screen", function()
        local precomputedHeightMap = Require.optionally "PrecomputedHeightMap"

        if precomputedHeightMap then
            GetTerrainZ = _G.GetTerrainZ
        else
            moveableLoc = Location(0, 0)
            GetTerrainZ = function(x, y)
                MoveLocation(moveableLoc, x, y)
                return GetLocationZ(moveableLoc)
            end
        end

        TimerStart(CreateTimer(), TIME_STEP, true, function()
            preCalc = false
        end)
    end)
end
if Debug then Debug.endFile() end