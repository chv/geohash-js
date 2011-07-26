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

		function refine_interval(interval, cd, mask) {
			var mid = (interval[0] + interval[1])/2;
			if (cd&mask){
				interval[0] = mid;
			}
			else{
				interval[1] = mid;
			}
		}

		function calculateAdjacent(srcHash, dir) {
			var srcHash = srcHash.toLowerCase(),
				lastChr = srcHash.charAt(srcHash.length-1),
				type = (srcHash.length % 2) ? 'odd' : 'even',
				base = srcHash.substring(0,srcHash.length-1);
			
			if (BORDERS[dir][type].indexOf(lastChr)!=-1){
				base = calculateAdjacent(base, dir);
			}
			return base + BASE32.charAt(NEIGHBORS[dir][type].indexOf(lastChr));
		}

		function decodeGeoHash(geohash) {
			var is_even = 1,
				lat = [-90.0, 90.0],
				lon = [-180.0, 180.0],
				lat_err = 90.0,
				lon_err = 180.0,
				l = geohash.length, 
				i, j, c, cd, mask;
			
			for (i=0; i<l; i++) {
				c = geohash.charAt(i);
				cd = BASE32.indexOf(c);
				for (j=0; j<5; j++) {
					mask = BITS[j];
					if (is_even) {
						lon_err /= 2;
						refine_interval(lon, cd, mask);
					} else {
						lat_err /= 2;
						refine_interval(lat, cd, mask);
					}
					is_even = !is_even;
				}
			}
			lat[2] = (lat[0] + lat[1])/2;
			lon[2] = (lon[0] + lon[1])/2;

			return { latitude: lat, longitude: lon};
		}

		function encodeGeoHash(latitude, longitude, precision) {
			var is_even = 1,
				i = 0,
				lat = [-90.0, 90.0],
				lon = [-180.0, 180.0],
				bit = 0,
				ch = 0,
				precision = precision || 12,
				geohash = "",
				mid;
	
			while (geohash.length < precision) {
				if (is_even) {
					mid = (lon[0] + lon[1]) / 2;
					if (longitude > mid) {
						ch |= BITS[bit];
						lon[0] = mid;
					}
					else{
						lon[1] = mid;
					}
				}
				else{
					mid = (lat[0] + lat[1]) / 2;
					if (latitude > mid) {
						ch |= BITS[bit];
						lat[0] = mid;
					}
					else{
						lat[1] = mid;
					}
				}

				is_even = !is_even;
				if (bit < 4){
					bit++;
				}
				else{
					geohash += BASE32.charAt(ch);
					bit = 0;
					ch = 0;
				}
			}
			return geohash;
		}
		
		function encodeLine2GeoHash(lat1, lon1, lat2, lon2, precision){
			var result = [],
				hash1 = encodeGeoHash(lat1, lon1, precision),
				box1 = decodeGeoHash(hash1),
				walkline = function(hash, box, fromdir){
					var i, dir, nexthash, nextbox,
						seg = [
							{lat1: box.latitude[0], lon1: box.longitude[0], lat2: box.latitude[0], lon2: box.longitude[1], edge: "bottom"},
							{lat1: box.latitude[0], lon1: box.longitude[1], lat2: box.latitude[1], lon2: box.longitude[1], edge: "right"},
							{lat1: box.latitude[1], lon1: box.longitude[1], lat2: box.latitude[1], lon2: box.longitude[0], edge: "top"},
							{lat1: box.latitude[1], lon1: box.longitude[0], lat2: box.latitude[0], lon2: box.longitude[0], edge: "left"}
						],
						l = seg.length;
					
					result.push({hash: hash, box: box});
					for(i=0; i<l; i++){
						if(intersectLineSegment(lat1, lon1, lat2, lon2, seg[i].lat1, seg[i].lon1, seg[i].lat2, seg[i].lon2)){
							dir = seg[i].edge;
							if(dir !== fromdir){
								nexthash = calculateAdjacent(hash, dir);
								nextbox = decodeGeoHash(nexthash);
								walkline(nexthash, nextbox, OPPOSITE[dir]);
								return;
							}
						}
					}
					return;
				};
			
			walkline(hash1, box1, "");
			return result;
		}
		
		function intersectLineSegment(lat1, lon1, lat2, lon2, lat3, lon3, lat4, lon4){
			return (((lon1 - lon2) * (lat3 - lat1) + (lat1 - lat2) * (lon1 - lon3)) * ((lon1 - lon2) * (lat4 - lat1) + (lat1 - lat2) * (lon1 - lon4)) < 0 && ((lon3 - lon4) * (lat1 - lat3) + (lat3 - lat4) * (lon3 - lon1)) * ((lon3 - lon4) * (lat2 - lat3) + (lat3 - lat4) * (lon3 - lon2)) < 0);
		}
		
		//return interface
		return {
			encode: encodeGeoHash,
			decode: decodeGeoHash,
			adjacent: calculateAdjacent,
			encodeLine: encodeLine2GeoHash
		};
	})();
	
	//commonJS interface
	if(typeof exports === 'undefined'){
		exports = {};
	}
	exports.GeoHash = GeoHash;
}
})();




