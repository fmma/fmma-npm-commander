local parent_path = debug.getinfo(1, "S").source:match[[^@?(.*[\/])[^\/]-$]]
FMMA_COMMANDER_ARGS_PATH = parent_path.."args"
local modules_path = parent_path.."modules/?.lua"
if not package.path:find(modules_path, 1, true--[[plain]]) then
    package.path = modules_path..";"..package.path
end
