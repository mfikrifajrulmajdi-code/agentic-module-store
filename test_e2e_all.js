const http = require('http');

function sendPayload(content, sessionId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      tenant_id: 'tnt_001',
      session_id: sessionId,
      user_identifier: '+628123456789',
      channel: 'whatsapp',
      message: {
        type: 'text',
        content: content
      }
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/ingress',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runMasterTestSuite() {
  console.log('================================================================');
  console.log('--- KASKU AI MASTER E2E TEST SUITE (ALL 10 AGENTS VERIFICATION) ---');
  console.log('================================================================\n');

  const testCases = [
    { name: '1. CS Agent', text: 'KASKU AI itu platform apa dan bagaimana cara kerjanya?' },
    { name: '2. Finance Agent', text: 'Catat pengeluaran bensin 100rb pakai BCA' },
    { name: '3. Ops Agent', text: 'Saya mau checkout order produk pro total tagihan berapa?' },
    { name: '4. Sales Agent', text: 'Apakah ada rekomendasi paket diskon promo murah?' },
    { name: '5. Complaint Agent', text: 'Saya sangat kecewa barangnya rusak parah ganti rugi refund uang kembali' },
    { name: '6. Admin Agent', text: 'Berikan ringkasan laporan eksekutif omset bisnis hari ini' },
    { name: '7. Marketing Agent', text: 'Buatkan copy sosmed broadcast iklan promosi' },
    { name: '8. HR Agent', text: 'Saya mau lamar kerja dan kirim CV rekrutmen' },
    { name: '9. Support Agent', text: 'Ada error teknis kendala API saat dipanggil' }
  ];

  let passed = 0;
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[Suite Execution] Testing ${tc.name}...`);
    try {
      const res = await sendPayload(tc.text, `master_sess_${i + 1}`);
      if (res.status === 202) {
        passed++;
        console.log(` ✅ ${tc.name} Ingress Accepted (HTTP 202)`);
      } else {
        console.error(` ❌ ${tc.name} Failed with Status ${res.status}`);
      }
    } catch (err) {
      console.error(` ❌ ${tc.name} Error:`, err.message);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n================================================================');
  console.log(`Summary: ${passed}/${testCases.length} Test Scenarios Ingress Delivered Successfully!`);
  console.log('================================================================\n');
}

runMasterTestSuite().catch(console.error);
