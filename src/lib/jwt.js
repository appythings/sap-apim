const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const jsrsasign = require('jsrsasign');

const getX5t = (publicCert) => {
    const x509 = new jsrsasign.X509();
    x509.readCertPEM(publicCert); // read certificate
    return jsrsasign.hextob64(jsrsasign.KJUR.crypto.Util.hashHex(x509.hex, 'sha1'));
};

module.exports = {
    create: (client_id, privateKey, publicCert, aud) => {
        return jwt.sign({
                aud,
                iss: client_id,
                sub: client_id,
                jti: uuidv4(),
                iat: (Math.floor(Date.now() / 1000)),
                nbf: (Math.floor(Date.now() / 1000)),
                exp: (Math.floor(Date.now() / 1000) + 60),
            },
            privateKey,
            {
                algorithm: 'RS256',
                header: {
                    x5t: getX5t(publicCert),
                },
            });
    },
};
