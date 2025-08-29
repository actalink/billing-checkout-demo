# 🔄 Checkout Session Cron Job

This document explains the checkout session monitoring cron job that runs every 5 seconds to check the status of open checkout sessions.

## 🎯 **Overview**

The cron job automatically monitors all checkout sessions with `status: "open"` in the database and verifies their current status by making API calls to the billing service.

## ⚙️ **Configuration**

### Environment Variables

Make sure you have the following environment variable set in your `.env` file:

```bash
APIKEY=your_billing_service_api_key_here
```

### Database Schema

The cron job works with the `checkout_session` table:

```sql
CREATE TABLE checkout_session (
  id TEXT PRIMARY KEY,
  billing_checkout_id TEXT,
  billing_order_id TEXT,
  status VARCHAR(255) CHECK (status IN ('open', 'success', 'failure', 'timeout'))
);
```

## 🚀 **How It Works**

### 1. **Automatic Monitoring**

- Runs every **5 seconds** automatically
- Scans the database for sessions with `status = 'open'`
- Makes API calls to verify current status

### 2. **API Verification**

- Endpoint: `http://localhost:4000/billing/api/v1/paysession/{checkoutId}`
- Method: `GET`
- Headers: `x-api-key: {APIKEY}`

### 3. **Response Handling**

- **Status 200**: Session is still active ✅
- **Other Statuses**: Logged for monitoring ℹ️
- **Errors**: Logged with detailed error information ❌

## 📊 **Logging Examples**

### Successful Check

```
🔍 [2024-01-15T10:30:00.000Z] Checking 2 open checkout sessions...
✅ Success: Checkout session abc123 (checkout_xyz789) is still active
✅ Success: Checkout session def456 (checkout_abc123) is still active
📊 [2024-01-15T10:30:00.000Z] Checkout session check complete: 2 success, 0 errors
```

### No Open Sessions

```
🔍 [2024-01-15T10:30:05.000Z] Checking 0 open checkout sessions...
```

### Error Handling

```
🔍 [2024-01-15T10:30:10.000Z] Checking 1 open checkout sessions...
❌ Error checking session abc123 (checkout_xyz789): Network error
📊 [2024-01-15T10:30:10.000Z] Checkout session check complete: 0 success, 1 errors
```

## 🧪 **Testing**

### 1. **Manual Trigger**

Test the cron job manually using the API endpoint:

```bash
curl -X POST http://localhost:3001/api/test/checkout-sessions
```

### 2. **Test Script**

Run the provided test script:

```bash
npm run test:cron
```

### 3. **Monitor Logs**

Watch the server logs to see the cron job in action:

```bash
npm run dev
```

## 🔧 **API Endpoints**

### Manual Trigger

- **URL**: `POST /api/test/checkout-sessions`
- **Purpose**: Manually trigger the checkout session check
- **Response**: JSON with success message and timestamp

### Health Check

- **URL**: `GET /api/health`
- **Purpose**: Verify server is running
- **Response**: Server status and timestamp

## 📝 **Code Structure**

### Main Functions

1. **`checkOpenCheckoutSessions()`**

   - Main cron job function
   - Queries database for open sessions
   - Makes API calls to verify status
   - Handles errors and timeouts

2. **`setupCheckoutSessionMonitoring()`**

   - Sets up the 5-second interval
   - Called during server initialization

3. **`triggerCheckoutSessionCheck()`**
   - Manual trigger function
   - Used for testing and manual execution

### Performance Optimization: Promise.all() vs For Loop

The cron job uses **`Promise.allSettled()`** instead of a traditional `for` loop for significant performance improvements:

#### **For Loop (Sequential) - ❌ Slow**

```typescript
// This would take 10 seconds for 10 sessions (1 second each)
for (const session of openSessions) {
  const response = await fetch(url); // Wait for each request
  // Process response
}
```

#### **Promise.all() (Parallel) - ✅ Fast**

```typescript
// This takes only 1 second for 10 sessions (all run simultaneously)
const promises = openSessions.map((session) => fetch(url));
const results = await Promise.all(promises);
```

#### **Promise.allSettled() (Parallel + Error Resilient) - 🚀 Best**

```typescript
// Parallel execution + continues even if some requests fail
const promises = openSessions.map((session) => fetch(url));
const results = await Promise.allSettled(promises);
// All requests complete, failed ones are marked as rejected
```

#### **Performance Comparison**

| Sessions | For Loop   | Promise.all() | Improvement |
| -------- | ---------- | ------------- | ----------- |
| 5        | 5 seconds  | 1 second      | 5x faster   |
| 10       | 10 seconds | 1 second      | 10x faster  |
| 20       | 20 seconds | 1 second      | 20x faster  |

### Error Handling

- **Network Timeouts**: 10-second timeout per request
- **API Errors**: Detailed error logging
- **Database Errors**: Graceful error handling
- **Missing API Key**: Warning logs

## 🚨 **Troubleshooting**

### Common Issues

1. **API Key Missing**

   ```
   ⚠️ APIKEY not found in environment variables
   ```

   **Solution**: Add `APIKEY=your_key` to `.env` file

2. **Connection Refused**

   ```
   ❌ Error checking session: connect ECONNREFUSED
   ```

   **Solution**: Ensure billing service is running on port 4000

3. **Timeout Errors**
   ```
   ⏰ Timeout: Checkout session request timed out
   ```
   **Solution**: Check billing service response time

### Debug Mode

Enable detailed logging by setting environment variable:

```bash
DEBUG=true npm run dev
```

## 🔄 **Customization**

### Change Interval

Modify the interval in `setupCheckoutSessionMonitoring()`:

```typescript
// Change from 5 seconds to 10 seconds
setInterval(checkOpenCheckoutSessions, 10 * 1000);
```

### Add Status Updates

Uncomment the status update code to automatically update session status:

```typescript
// Update session status after successful verification
await db
  .update(checkoutSession)
  .set({ status: "verified" })
  .where(eq(checkoutSession.id, session.id));
```

### Custom API Endpoint

Modify the API endpoint in `checkOpenCheckoutSessions()`:

```typescript
const response = await fetch(
  `https://your-custom-domain.com/api/v1/paysession/${session.billingCheckoutId}`
  // ... rest of the code
);
```

## 📈 **Performance Considerations**

- **Database Queries**: Optimized with proper indexing
- **API Calls**: 10-second timeout prevents hanging requests
- **Memory Usage**: Minimal memory footprint
- **CPU Usage**: Lightweight interval-based execution

## 🔒 **Security**

- **API Key**: Stored in environment variables
- **Rate Limiting**: Applied to all API endpoints
- **Input Validation**: All inputs are validated
- **Error Logging**: No sensitive data in logs

## 📚 **Related Files**

- `src/db/index.ts` - Main cron job implementation
- `src/server.ts` - Server setup and endpoint registration
- `test-cron.js` - Testing script
- `.env` - Environment configuration
- `package.json` - Dependencies and scripts

## 🆘 **Support**

If you encounter issues:

1. Check the server logs for error messages
2. Verify environment variables are set correctly
3. Ensure the billing service is accessible
4. Test the manual trigger endpoint
5. Check database connectivity

---

**Last Updated**: January 2024  
**Version**: 1.0.0
