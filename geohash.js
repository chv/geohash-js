// geohash.js
// Geohash library for Javascript
// (c) 2008 David Troy
// (c) 2011 inuro
// Distributed under the MIT License

(function(){
if(typeof GeoHash === 'undefined' || !GeoHash){
	GeoHash = (function(){
		var BITS = [16, 8, 4, 2, 1],
			BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz",
			OPPOSITE = {"left": "right", "right": "left", "top": "bottom", "bottom": "top"},
			NEIGHBORS = {
				right  : { even :  "bc01fg45238967deuvhjyznpkmstqrwx" },
				left   : { even :  "238967debc01fg45kmstqrwxuvhjyznp" },
				top    : { even :  "p0r21436x8zb9dcf5h7kjnmqesgutwvy" },
				bottom : { even :  "14365h7k9dcfesgujnmqp0r2twvyx8zb" }
			},
			BORDERS = {
				right  : { even : "bcfguvyz" },
				left   : { even : "0145hjnp" },
				top    : { even : "prxz" },
				bottom : { even : "028b" }
			};

		NEIGHBORS.bottom.odd = NEIGHBORS.left.even;
		NEIGHBORS.top.odd = NEIGHBORS.right.even;
		NEIGHBORS.left.odd = NEIGHBORS.bottom.even;
		NEIGHBORS.right.odd = NEIGHBORS.top.even;

		BORDERS.bottom.odd = BORDERS.left.even;
		BORDERS.top.odd = BORDERS.right.even;
		BORDERS.left.odd = BORDERS.bottom.even;
		BORDERS.right.odd = BORDERS.top.even;
		
		//constructor of HashObject 
		function HashObject(hashcode, lat1, lat2, lon1, lon2){
			this.hashcode = hashcode || "";
			this.latitude = [lat1, lat2];
			this.longitude = [lon1, lon2];
						
			return this;
		}
		HashObject.prototype = {
			toString: function(){
				return this.hashcode;
			},
			//return 4 points for drawing as rect
			rect: function(){
				return [
					{latitude: this.latitude[0], longitude: this.longitude[0]},
					{latitude: this.latitude[0], longitude: this.longitude[1]},
					{latitude: this.latitude[1], longitude: this.longitude[1]},
					{latitude: this.latitude[1], longitude: this.longitude[0]}
				];
			},
			//return center position
			center: function(){
				return {
					latitude: (this.latitude[0] + this.latitude[1]) / 2,
					longitude: (this.longitude[0] + this.longitude[1]) / 2
				};
			},
			//return neighbor hashobject
			neighbor: function(dir){
				var nexthashcode = calculateAdjacent(this.hashcode, dir);
				return decodeGeoHash(nexthashcode);
			}
		}

		function calculateAdjacent(hashcode, dir) {
			var hashcode = hashcode.toLowerCase(),
				lastChr = hashcode.charAt(hashcode.length-1),
				type = (hashcode.length % 2) ? 'odd' : 'even',
				basecode = hashcode.substring(0, hashcode.length-1);
			
			if (BORDERS[dir][type].indexOf(lastChr)!=-1){
				basecode = calculateAdjacent(basecode, dir);
			}
			return basecode + BASE32.charAt(NEIGHBORS[dir][type].indexOf(lastChr));
		}

		function decodeGeoHash(hashcode) {
			var is_even = 1,
				lat = [-90.0, 90.0],
				lon = [-180.0, 180.0],
				precision = hashcode.length, 
				i, bit, c, cd, index, target;
			
			for (i=0; i<precision; i++) {
				c = hashcode.charAt(i);
				cd = BASE32.indexOf(c);
				for (bit=0; bit<5; bit++) {
					index = cd & BITS[bit] ? 0 : 1;
					target = is_even ? lon : lat;
					target[index] = (target[0] + target[1])/2;
					is_even = !is_even;
				}
			}
			return new HashObject(hashcode, lat[0], lat[1], lon[0], lon[1]);
		}

		function encodeGeoHash(latitude, longitude, precision) {
			var is_even = 1,
				lat = {from: -90.0, to: 90.0, point: latitude},
				lon = {from: -180.0, to: 180.0, point: longitude},
				precision = precision || 12,
				hashcode = "",
				ch, bit, mid, target;
	
			while (hashcode.length < precision){
				ch = 0;
				for(bit=0; bit<5; bit++){
					target = is_even ? lon : lat;
					mid = (target.from + target.to) / 2;
					if (target.point > mid) {
						ch |= BITS[bit];
						target.from = mid;
					}
					else{
						target.to = mid;
					}
					is_even = !is_even;
				}
				hashcode += BASE32.charAt(ch);
			}
			return new HashObject(hashcode, lat.from, lat.to, lon.from, lon.to);
		}
		
		function encodeLine2GeoHash(lat1, lon1, lat2, lon2, precision){
			var result = [],
				hashobj1= encodeGeoHash(lat1, lon1, precision),
				walkline = function(hashobj, fromdir){
					var i, dir,
						seg = [
							{lat1: hashobj.latitude[0], lon1: hashobj.longitude[0], lat2: hashobj.latitude[0], lon2: hashobj.longitude[1], edge: "bottom"},
							{lat1: hashobj.latitude[0], lon1: hashobj.longitude[1], lat2: hashobj.latitude[1], lon2: hashobj.longitude[1], edge: "right"},
							{lat1: hashobj.latitude[1], lon1: hashobj.longitude[1], lat2: hashobj.latitude[1], lon2: hashobj.longitude[0], edge: "top"},
							{lat1: hashobj.latitude[1], lon1: hashobj.longitude[0], lat2: hashobj.latitude[0], lon2: hashobj.longitude[0], edge: "left"}
						];
					
					result.push(hashobj);
					for(i=0; i<4; i++){
						if(intersectLineSegment(lat1, lon1, lat2, lon2, seg[i].lat1, seg[i].lon1, seg[i].lat2, seg[i].lon2)){
							dir = seg[i].edge;
							if(dir !== fromdir){
								walkline(hashobj.neighbor(dir), OPPOSITE[dir]);
								return;
							}
						}
					}
					return;
				};
			
			walkline(hashobj1, "");
			return result;
		}
		
		function intersectLineSegment(lat1, lon1, lat2, lon2, lat3, lon3, lat4, lon4){
			return (((lon1 - lon2) * (lat3 - lat1) + (lat1 - lat2) * (lon1 - lon3)) * ((lon1 - lon2) * (lat4 - lat1) + (lat1 - lat2) * (lon1 - lon4)) < 0 && ((lon3 - lon4) * (lat1 - lat3) + (lat3 - lat4) * (lon3 - lon1)) * ((lon3 - lon4) * (lat2 - lat3) + (lat3 - lat4) * (lon3 - lon2)) < 0);
		}
		
		//return interface
		return {
			encode: encodeGeoHash,
			decode: decodeGeoHash,
			calculateNeighborCode: calculateAdjacent,
			encodeLine: encodeLine2GeoHash,
			//old interface names
			encodeGeoHash: encodeGeoHash,
			decodeGeoHash: decodeGeoHash,
			calculateAdjacent: calculateAdjacent
		};
	})();
	
	//commonJS interface
	if(typeof exports === 'undefined'){
		exports = {};
	}
	exports.GeoHash = GeoHash;
}
})();




