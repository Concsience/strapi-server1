const crypto = require('crypto');

function makePath(path, token, x, y, z) {
    return `${path}=x${x}-y${y}-z${z}-t${token}`;
}

function fromHex(hex) {
    return Buffer.from(hex, 'hex');
}

function base64UrlEncode(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '_')
        .replace(/\//g, '_')
        .replace(/=+$/, ''); // Remove any trailing '='
}

function computeSignedPath(path, token, x, y, z) {
    const signPath = makePath(path, token, x, y, z);
    const hmacKey = fromHex('7b2b4e23de2cc5c5'); // same as your frontend

    const hmac = crypto.createHmac('sha1', hmacKey);
    hmac.update(signPath);
    const signature = base64UrlEncode(hmac.digest());

    return makePath(path, signature, x, y, z);
}
function resolveRelative(path, base) {
	// absolute URL
	if (path.match(/\w*:\/\//)) {
		return path;
	}
	// Protocol-relative URL
	if (path.indexOf("//") === 0) {
		var protocol = base.match(/\w+:/) || ["http:"];
		return protocol[0] + path;
	}
	// Upper directory
	if (path.indexOf("../") === 0) {
		return resolveRelative(path.slice(3), base.replace(/\/[^\/]*$/, ''));
	}
	// Relative to the root
	if (path[0] === '/') {
		var match = base.match(/(\w*:\/\/)?[^\/]*\//) || [base];
		return match[0] + path.slice(1);
	}
	//relative to the current directory
	return base.replace(/\/[^\/]*$/, "") + '/' + path;
}


module.exports = { computeSignedPath, resolveRelative };