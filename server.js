import dotenv from 'dotenv';
import express from 'express';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.BFF_PORT || 8787);
const upstreamBaseUrl = (process.env.CFCT_BASE_URL || 'https://cfct.sditt.com.tw').replace(/\/+$/, '');
const apiKey = process.env.CFCT_API_KEY || '';
const upstreamTimeoutMs = Number(process.env.CFCT_TIMEOUT_MS || 15000);

app.use(express.json());

function jsonFailure(error, status = 502) {
  return {
    status,
    body: {
      success: false,
      data: null,
      error,
      conflict: null,
    },
  };
}

async function forwardJson(res, path, init = {}) {
  if (!apiKey) {
    const failure = jsonFailure('伺服器尚未設定 CFCT_API_KEY，無法呼叫 Chinafood API。', 500);
    res.status(failure.status).json(failure.body);
    return;
  }

  const headers = {
    Accept: 'application/json',
    'X-Api-Key': apiKey,
    ...init.headers,
  };

  if (init.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs);

  try {
    const response = await fetch(`${upstreamBaseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      if (!response.ok) {
        console.error('[BFF] Upstream returned error JSON', {
          path,
          method: init.method || 'GET',
          status: response.status,
          bodyPreview: text.slice(0, 300),
        });
      }
      res.status(response.status).type('application/json').send(text);
      return;
    }

    console.error('[BFF] Upstream returned non-JSON response', {
      path,
      method: init.method || 'GET',
      status: response.status,
      contentType,
      bodyPreview: text.slice(0, 300),
    });
    const failure = jsonFailure(text || '上游 API 回傳非 JSON 內容', response.status);
    res.status(failure.status).json(failure.body);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? `上游 API 請求逾時 (${upstreamTimeoutMs}ms)`
      : error instanceof Error
        ? error.message
        : '無法連線至 Chinafood API';
    console.error('[BFF] Upstream request failed', {
      path,
      method: init.method || 'GET',
      message,
    });
    const failure = jsonFailure(message);
    res.status(failure.status).json(failure.body);
  } finally {
    clearTimeout(timeout);
  }
}

async function forwardMultipart(req, res, path) {
  if (!apiKey) {
    const failure = jsonFailure('伺服器尚未設定 CFCT_API_KEY，無法呼叫 Chinafood API。', 500);
    res.status(failure.status).json(failure.body);
    return;
  }

  const headers = {
    Accept: 'application/json',
    'X-Api-Key': apiKey,
  };

  const contentType = req.headers['content-type'];
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  try {
    const response = await fetch(`${upstreamBaseUrl}${path}`, {
      method: 'POST',
      headers,
      body: req,
      duplex: 'half',
    });
    const text = await response.text();
    const responseContentType = response.headers.get('content-type') || '';

    if (responseContentType.includes('application/json')) {
      res.status(response.status).type('application/json').send(text);
      return;
    }

    const failure = jsonFailure(text || '上游附件 API 回傳非 JSON 內容', response.status);
    res.status(failure.status).json(failure.body);
  } catch (error) {
    const failure = jsonFailure(error instanceof Error ? error.message : '無法連線至 Chinafood API');
    res.status(failure.status).json(failure.body);
  }
}

async function forwardBinary(res, path) {
  if (!apiKey) {
    const failure = jsonFailure('伺服器尚未設定 CFCT_API_KEY，無法呼叫 Chinafood API。', 500);
    res.status(failure.status).json(failure.body);
    return;
  }

  try {
    const response = await fetch(`${upstreamBaseUrl}${path}`, {
      headers: {
        Accept: '*/*',
        'X-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      const failure = jsonFailure(text || '附件下載失敗', response.status);
      res.status(failure.status).json(failure.body);
      return;
    }

    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');
    const contentLength = response.headers.get('content-length');
    const arrayBuffer = await response.arrayBuffer();

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    res.status(response.status).send(Buffer.from(arrayBuffer));
  } catch (error) {
    const failure = jsonFailure(error instanceof Error ? error.message : '無法下載附件');
    res.status(failure.status).json(failure.body);
  }
}

app.get('/app-api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      configured: Boolean(apiKey),
      upstreamBaseUrl,
    },
    error: null,
    conflict: null,
  });
});

app.get('/app-api/leave-types', (req, res) => {
  const rawCategory = req.query.Category ?? req.query.category ?? '';
  const category = String(rawCategory).trim();
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return forwardJson(res, `/api/leave-type/list${query}`);
});

app.post('/app-api/applications', (req, res) => {
  return forwardJson(res, '/api/application', {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

app.post('/app-api/attachment', (req, res) => {
  return forwardMultipart(req, res, '/api/attachment');
});

app.get('/app-api/attachments', (req, res) => {
  const appSeqNo = String(req.query.appSeqNo || '').trim();
  const query = appSeqNo ? `?appSeqNo=${encodeURIComponent(appSeqNo)}` : '';
  return forwardJson(res, `/api/attachment/list${query}`);
});

app.get('/app-api/attachments/:seqNo/download', (req, res) => {
  return forwardBinary(res, `/api/attachment/${req.params.seqNo}/download`);
});

app.get('/app-api/applications/mine', (req, res) => {
  const employeeNo = String(req.query.employeeNo || '').trim();
  const query = employeeNo ? `?employeeNo=${encodeURIComponent(employeeNo)}` : '';
  return forwardJson(res, `/api/application/mine${query}`);
});

app.get('/app-api/applications/:seqNo', (req, res) => {
  return forwardJson(res, `/api/application/${req.params.seqNo}`);
});

app.patch('/app-api/applications/:seqNo/cancel', (req, res) => {
  return forwardJson(res, `/api/application/${req.params.seqNo}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.post('/app-api/applications/:seqNo/supplement', (req, res) => {
  return forwardJson(res, `/api/application/${req.params.seqNo}/supplement`, {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

app.get('/app-api/approval/dept-list', (req, res) => {
  const employeeNo = String(req.query.employeeNo || '').trim();
  const status = String(req.query.status || '').trim();
  const searchParams = new URLSearchParams();

  if (employeeNo) {
    searchParams.set('employeeNo', employeeNo);
  }

  if (status) {
    searchParams.set('status', status);
  }

  const query = searchParams.toString();
  return forwardJson(res, `/api/approval/dept-list${query ? `?${query}` : ''}`);
});

app.get('/app-api/approval/inbox', (req, res) => {
  const employeeNo = String(req.query.employeeNo || '').trim();
  const searchParams = new URLSearchParams();

  if (employeeNo) {
    searchParams.set('employeeNo', employeeNo);
  }

  const query = searchParams.toString();
  return forwardJson(res, `/api/approval/inbox${query ? `?${query}` : ''}`);
});

app.patch('/app-api/approval/:seqNo/return', (req, res) => {
  return forwardJson(res, `/api/approval/${req.params.seqNo}/return`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/approval/:seqNo/admin-return', (req, res) => {
  return forwardJson(res, `/api/approval/${req.params.seqNo}/admin-return`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/approval/:seqNo/reject', (req, res) => {
  return forwardJson(res, `/api/approval/${req.params.seqNo}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/approval/:seqNo/admin-reject', (req, res) => {
  return forwardJson(res, `/api/approval/${req.params.seqNo}/admin-reject`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/approval/:seqNo/approve', (req, res) => {
  return forwardJson(res, `/api/approval/${req.params.seqNo}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/approval/:seqNo/admin-approve', (req, res) => {
  return forwardJson(res, `/api/approval/${req.params.seqNo}/admin-approve`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.get('/app-api/hr/applications', (req, res) => {
  const searchParams = new URLSearchParams();
  ['status', 'deptNo', 'category', 'from', 'to', 'agentEmpNo'].forEach((key) => {
    const value = String(req.query[key] || '').trim();
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return forwardJson(res, `/api/hr/application/all${query ? `?${query}` : ''}`);
});

app.get('/app-api/hr/application/export', (req, res) => {
  const searchParams = new URLSearchParams();
  ['status', 'deptNo', 'category', 'from', 'to', 'agentEmpNo'].forEach((key) => {
    const value = String(req.query[key] || '').trim();
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return forwardBinary(res, `/api/hr/application/export${query ? `?${query}` : ''}`);
});

app.get('/app-api/agent-request/inbox', (req, res) => {
  const employeeNo = String(req.query.employeeNo || '').trim();
  const searchParams = new URLSearchParams();

  if (employeeNo) {
    searchParams.set('employeeNo', employeeNo);
  }

  const query = searchParams.toString();
  return forwardJson(res, `/api/agent-request/inbox${query ? `?${query}` : ''}`);
});

app.post('/app-api/agent-request/:seqNo/accept', (req, res) => {
  return forwardJson(res, `/api/agent-request/${req.params.seqNo}/accept`, {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

app.post('/app-api/agent-request/:seqNo/reject', (req, res) => {
  return forwardJson(res, `/api/agent-request/${req.params.seqNo}/reject`, {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

app.get('/app-api/accounts', (req, res) => {
  const includeAll = req.query.includeAll === 'true' ? '?IncludeAll=true' : '';
  return forwardJson(res, `/api/account/list${includeAll}`);
});

app.get('/app-api/accounts/by-line/:lineUserId', (req, res) => {
  return forwardJson(res, `/api/account/by-line/${encodeURIComponent(req.params.lineUserId)}`);
});

app.get('/app-api/accounts/:seqNo', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}`);
});

app.post('/app-api/accounts', (req, res) => {
  return forwardJson(res, '/api/account', {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

function revokeApiKey(req, res) {
  return forwardJson(res, `/api/api-key/${req.params.seqNo}/revoke`, {
    method: 'PATCH',
    body: JSON.stringify(req.body || {}),
  });
}

app.patch('/app-api/api-key/:seqNo/revoke', revokeApiKey);
app.patch('/app-api/api-keys/:seqNo/revoke', revokeApiKey);

app.patch('/app-api/accounts/:seqNo/role', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}/role`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/accounts/:seqNo/profile', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/accounts/:seqNo/org', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}/org`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/accounts/:seqNo/password-reset', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}/password-reset`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/accounts/:seqNo/line-binding', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}/line-binding`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/accounts/:seqNo/unlock', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}/unlock`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.delete('/app-api/accounts/:seqNo', (req, res) => {
  return forwardJson(res, `/api/account/${req.params.seqNo}`, {
    method: 'DELETE',
    body: JSON.stringify(req.body),
  });
});

app.get('/app-api/line-users/active', (_req, res) => {
  return forwardJson(res, '/api/line-user/all-active');
});

app.get('/app-api/employees', (_req, res) => {
  return forwardJson(res, '/api/employee/list');
});

app.get('/app-api/employees/:seqNo', (req, res) => {
  return forwardJson(res, `/api/employee/${req.params.seqNo}`);
});

app.post('/app-api/employees', (req, res) => {
  return forwardJson(res, '/api/employee', {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/employees/:seqNo', (req, res) => {
  return forwardJson(res, `/api/employee/${req.params.seqNo}`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.delete('/app-api/employees/:seqNo', (req, res) => {
  return forwardJson(res, `/api/employee/${req.params.seqNo}`, {
    method: 'DELETE',
    body: JSON.stringify(req.body),
  });
});

app.get('/app-api/departments', (_req, res) => {
  return forwardJson(res, '/api/department/list');
});

app.get('/app-api/departments/:seqNo', (req, res) => {
  return forwardJson(res, `/api/department/${req.params.seqNo}`);
});

app.post('/app-api/departments', (req, res) => {
  return forwardJson(res, '/api/department', {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

app.patch('/app-api/departments/:seqNo', (req, res) => {
  return forwardJson(res, `/api/department/${req.params.seqNo}`, {
    method: 'PATCH',
    body: JSON.stringify(req.body),
  });
});

app.delete('/app-api/departments/:seqNo', (req, res) => {
  return forwardJson(res, `/api/department/${req.params.seqNo}`, {
    method: 'DELETE',
    body: JSON.stringify(req.body),
  });
});

app.listen(port, () => {
  console.log(`Chinafood BFF listening on http://127.0.0.1:${port}`);
});
