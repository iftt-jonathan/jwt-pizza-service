const os = require('os');
const fetch = require('node-fetch');
const config = require('./config.js');

class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  addMetric(prefix, category, metricName, metricValue) {
    const metric = `${prefix},source=${config.metrics.source},category=${category} ${metricName}=${metricValue}`;
    this.metrics.push(metric);
  }

  toString(separator = '\n') {
    return this.metrics.join(separator);
  }
}

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.httpRequests = { GET: 0, POST: 0, DELETE: 0, PUT: 0 };
    this.httpRequestLatencies = 0;
    this.activeUsers = new Set();
    this.authAttempts = { success: 0, failed: 0 };
    this.businessMetrics = {
      pizzasSold: 0,
      revenue: 0,
      orderLatency: 0,
      purchaseFailures: 0,
    };

    this.initPeriodicReporting(5000);
  }

  // Middleware to track HTTP requests
  requestTracker(req, res, next) {
    this.totalRequests++;
    const method = req.method.toUpperCase();
    if (this.httpRequests[method] !== undefined) {
      this.httpRequests[method]++;
    }

    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const latencyMs = Number((end - start) / BigInt(1e6));
      this.httpRequestLatencies = latencyMs;
    });

    next();
  }

  // Track active users
  trackUser(userId) {
    this.activeUsers.add(userId);
  }

  removeUser(userId) {
    this.activeUsers.delete(userId);
  }

  // Track authentication attempts
  trackAuth(success) {
    if (success) {
      this.authAttempts.success++;
    } else {
      this.authAttempts.failed++;
    }
  }

  // Track pizza sales and revenue
  trackPizzaSale(price) {
    this.businessMetrics.pizzasSold++;
    this.businessMetrics.revenue += price;
  }

  trackOrderLatency(latency) {
    this.businessMetrics.orderLatency = latency;
  }

  trackPurchaseFailure() {
    this.businessMetrics.purchaseFailures++;
  }

  sendMetricToGrafana(metrics) {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metrics,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metrics}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }

  collectHttpMetrics(buf) {
    buf.addMetric('http', 'all', 'total', this.totalRequests);
    for (const method in this.httpRequests) {
      buf.addMetric('http', method.toLowerCase(), 'total', this.httpRequests[method]);
    }
    buf.addMetric('http', 'request', 'latency', this.httpRequestLatencies);
  }

  collectAuthMetrics(buf) {
    buf.addMetric('auth', 'attempts', 'success', this.authAttempts.success);
    buf.addMetric('auth', 'attempts', 'failed', this.authAttempts.failed);
  }

  collectUserMetrics(buf) {
    buf.addMetric('users', 'active', 'count', this.activeUsers.size);
  }

  collectBusinessMetrics(buf) {
    buf.addMetric('business', 'pizzas', 'sold', this.businessMetrics.pizzasSold);
    buf.addMetric('business', 'revenue', 'total', this.businessMetrics.revenue.toFixed(2));

    buf.addMetric('business', 'pizzas', 'purchase_failures', this.businessMetrics.purchaseFailures);
    buf.addMetric('business', 'order', 'latency', this.businessMetrics.orderLatency);
  }

  collectSystemMetrics(buf) {
    buf.addMetric('system', 'cpu', 'usage', this.getCpuUsagePercentage());
    buf.addMetric('system', 'memory', 'usage', this.getMemoryUsagePercentage());
  }

  initPeriodicReporting(period) {
    setInterval(() => {
      try {
        const buf = new MetricBuilder();
        this.collectHttpMetrics(buf);
        this.collectAuthMetrics(buf);
        this.collectUserMetrics(buf);
        this.collectBusinessMetrics(buf);
        this.collectSystemMetrics(buf);

        this.sendMetricToGrafana(buf.toString('\n'));
      } catch (error) {
        console.error('Error sending metrics:', error);
      }
    }, period).unref();
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return (cpuUsage * 100).toFixed(2);
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return ((usedMemory / totalMemory) * 100).toFixed(2);
  }
}

const metrics = new Metrics();
module.exports = metrics;
