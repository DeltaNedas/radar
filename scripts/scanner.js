/*
	Copyright (c) DeltaNedas 2020

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// How many tiles to scan each tick, affects lag
const chunkSize = Core.settings.get("radar.chunk-size", 100);

const scanner = {
	results: [],
	query: null,
	team: null,
	chunk: 0,
	limit: null
};

const valid = (name, blocks, team) => {
	if (scanner.team && team != scanner.team) {
		return false;
	}

	for (var i in blocks) {
		var block = blocks[i];
		if (block.name.includes(name)) {
			return true;
		}
	}
	return false;
};

const scanChunk = () => {
	const chunk = scanner.chunk++ * chunkSize;
	const name = scanner.query;

	/* Scan the chunk now */
	for (var i = 0; i < chunkSize; i++) {
		var x = (chunk + i) % Vars.world.width();
		var y = Math.ceil((chunk + i) / Vars.world.width());
		var tile = Vars.world.tile(x, y);
		if (tile && valid(name, [
				tile.block(),
				tile.floor(),
				tile.overlay()
			], tile.team)) {
			scanner.results.push({tile: tile, age: 0});
			if (global.tracker) {
				global.tracker.setMarker({x: x * Vars.tilesize, y: y * Vars.tilesize});
			}
		}
	}

	// Stop scanning when the whole map is done
	if (scanner.chunk == scanner.limit) {
		scanner.query = null;
	}
};

Events.on(WorldLoadEvent, () => {
	scanner.limit = Math.floor(Vars.world.width() * Vars.world.height() / chunkSize);
	scanner.results = [];
});

Events.run(Trigger.update, () => {
	if (scanner.query !== null) {
		scanChunk();
	}
});

scanner.scan = input => {
	scanner.results = [];
	scanner.chunk = 0;

	/* Parse the input for modifiers */
	const team = input.match(/(.+)\$(.+)/);

	scanner.query = team ? team[1] : input;
	try {
		scanner.team = Team[team[2]];
	} catch (e) {
		// Invalid or unspecified team
		scanner.team = null;
	}
};

scanner.cancel = () => {
	scanner.query = null;
};

scanner.label = () => {
	return (scanner.query ? "" : "[green]") + scanner.results.length
		+ (scanner.chunk == 0 ? "" : scanner.percent());
};

scanner.percent = () => {
	return " " + Math.round((scanner.chunk / scanner.limit) * 100) + "%";
};

module.exports = scanner;
