const https = require('https');

function request(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: 'signal24-backend.onrender.com',
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'signal24admin',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

const oldBets = ['me-ceasefire', 'me-iran-retaliation', 'red-sea-houthis', 'ukraine-territory', 'ukraine-aid', 'oil-prices', 'un-resolution', 'war-iran-us', 'proxy-conflicts', 'oil-spike-temp', 'cyberattacks', 'europe-pressure', 'misinfo-surge', 'no-us-invasion'];

const newBets = [
    { category: 'Middle East', id: '1-no-full-scale-war', label: 'It won\'t turn into a full declared war between Iran and the US in the next 3 months.', icon: '⚔️', choices: ['Yes', 'No'] },
    { category: 'Middle East', id: '2-proxy-conflicts-continue', label: 'Tensions will continue through proxy groups instead of direct massive invasion.', icon: '🛡️', choices: ['Yes', 'No'] },
    { category: 'Markets', id: '3-oil-prices-spike', label: 'Oil prices will spike briefly but stabilize within weeks.', icon: '🛢️', choices: ['Yes', 'No'] },
    { category: 'Tech & Cyber', id: '4-cyberattacks-increase', label: 'There will be cyberattacks reported between the sides instead of only physical attacks.', icon: '💻', choices: ['Yes', 'No'] },
    { category: 'Diplomacy', id: '5-diplomatic-pressure', label: 'European countries will push for de-escalation and ceasefire talks.', icon: '🇪🇺', choices: ['Yes', 'No'] },
    { category: 'Media', id: '6-misinfo-surges', label: 'Fake news and propaganda about the conflict will increase.', icon: '📱', choices: ['Yes', 'No'] },
    { category: 'Middle East', id: '7-no-direct-invasion', label: 'The US will avoid sending large ground forces into Iran.', icon: '🪖', choices: ['Yes', 'No'] }
];

(async () => {
    try {
        for (const id of oldBets) {
            await request('/admin/bet/remove', { betId: id });
        }
        for (const b of newBets) {
            const res = await request('/admin/bet/add', b);
            console.log('Added:', b.id, res);
        }
    } catch (e) {
        console.error(e);
    }
})();
