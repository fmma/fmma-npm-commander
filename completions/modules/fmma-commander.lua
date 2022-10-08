
local matchers = require("matchers")

local exports = {}

exports.parser = function (...)
    local p = clink.arg.new_parser(...)
        :setendofflags()
    p._deprecated = nil
    return p
end

local arg_cache = {}

local argmatcher = function(key)
    return function()
        local values = arg_cache[key]
        if(values ~= nil)
        then
            return values
        else
            values = {}
            for line in io.lines(FMMA_COMMANDER_ARGS_PATH .. "/" .. key) do
                values[#values+1] = line
            end
            arg_cache[key] = values
            return values;
        end
    end
end

exports.arg = function(key)
    return exports.parser({argmatcher(key)});
end

exports.files = function()
    local file_matches = clink.filematches or matchers.files
    return exports.parser({file_matches})
end

return exports