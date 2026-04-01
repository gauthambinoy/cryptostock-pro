import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Tabs,
  Tab,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Snackbar,
  Tooltip,
  Typography,
  List,
  ListItem,
  ListItemText,
  Code
} from '@mui/material';
import {
  FileCopy as FileCopyIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { Layout } from '../components/Layout';
import API from '../services/api';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DeveloperDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newKeyForm, setNewKeyForm] = useState({ name: '', pricing_tier: 'free' });
  const [error, setError] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keysRes, usageRes] = await Promise.all([
        API.get('/api/developer/keys'),
        API.get('/api/developer/usage')
      ]);

      setApiKeys(keysRes.data);
      setUsage(usageRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load developer data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyForm.name) {
      setError('API key name is required');
      return;
    }

    try {
      const res = await API.post('/api/developer/keys', newKeyForm);
      setNewKeyData(res.data);
      setNewKeyDialog(true);
      setNewKeyForm({ name: '', pricing_tier: 'free' });
      setOpenDialog(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create API key');
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (window.confirm('Are you sure? This will immediately revoke the API key.')) {
      try {
        await API.delete(`/api/developer/keys/${keyId}`);
        setSnackbar({ open: true, message: 'API key revoked', severity: 'success' });
        loadData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to revoke API key');
      }
    }
  };

  const handleRotateKey = async (keyId) => {
    if (window.confirm('Generate new credentials for this API key?')) {
      try {
        const res = await API.post(`/api/developer/keys/${keyId}/rotate`);
        setNewKeyData(res.data);
        setNewKeyDialog(true);
        setSnackbar({ open: true, message: 'API key rotated', severity: 'success' });
        loadData();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to rotate API key');
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold' }}>
            Developer Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your API keys and integrate AssetPulse predictions into your applications
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Overview Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      API Keys
                    </Typography>
                    <Typography variant="h5">{apiKeys.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total API Calls
                    </Typography>
                    <Typography variant="h5">{usage?.total_calls.toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Current Month Cost
                    </Typography>
                    <Typography variant="h5">${usage?.total_cost.toFixed(2)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => {
                        setError('');
                        setOpenDialog(true);
                      }}
                    >
                      Create New Key
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs */}
            <Paper>
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="API Keys" />
                <Tab label="Usage Statistics" />
                <Tab label="Documentation" />
                <Tab label="Pricing" />
              </Tabs>

              {/* Tab 1: API Keys */}
              <TabPanel value={tabValue} index={0}>
                {apiKeys.length === 0 ? (
                  <Alert severity="info">
                    No API keys yet. Create one to get started with the Developer API.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>Name</TableCell>
                          <TableCell>API Key</TableCell>
                          <TableCell>Tier</TableCell>
                          <TableCell>Rate Limit</TableCell>
                          <TableCell>Last Used</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {apiKeys.map((key) => (
                          <TableRow key={key.id}>
                            <TableCell>{key.name}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <code>{key.api_key.substring(0, 15)}...</code>
                                <Tooltip title="Copy">
                                  <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(key.api_key)}
                                  >
                                    <FileCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={key.pricing_tier.toUpperCase()}
                                color={
                                  key.pricing_tier === 'enterprise'
                                    ? 'error'
                                    : key.pricing_tier === 'pro'
                                    ? 'warning'
                                    : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{key.rate_limit_per_minute}/min</TableCell>
                            <TableCell>
                              {key.last_used
                                ? new Date(key.last_used).toLocaleDateString()
                                : 'Never'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={key.is_revoked ? 'Revoked' : 'Active'}
                                color={key.is_revoked ? 'default' : 'success'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Rotate Key">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRotateKey(key.id)}
                                  disabled={key.is_revoked}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteKey(key.id)}
                                  disabled={key.is_revoked}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>

              {/* Tab 2: Usage Statistics */}
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  {usage?.api_keys.map((key) => (
                    <Grid item xs={12} key={key.id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {key.name}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="textSecondary">Tier</Typography>
                              <Typography variant="body1">{key.tier}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="textSecondary">Rate Limit</Typography>
                              <Typography variant="body1">{key.rate_limit} calls/min</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="textSecondary">Total Calls</Typography>
                              <Typography variant="body1">
                                {key.monthly.reduce((sum, m) => sum + m.calls, 0).toLocaleString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Typography color="textSecondary">Total Cost</Typography>
                              <Typography variant="body1">
                                ${key.monthly.reduce((sum, m) => sum + m.cost, 0).toFixed(2)}
                              </Typography>
                            </Grid>
                          </Grid>
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Monthly Breakdown
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Month</TableCell>
                                  <TableCell align="right">Calls</TableCell>
                                  <TableCell align="right">Overage</TableCell>
                                  <TableCell align="right">Cost</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {key.monthly.map((month, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      {new Date(month.year, month.month - 1).toLocaleDateString(
                                        'en-US',
                                        {
                                          year: 'numeric',
                                          month: 'long'
                                        }
                                      )}
                                    </TableCell>
                                    <TableCell align="right">{month.calls.toLocaleString()}</TableCell>
                                    <TableCell align="right">{month.overage.toLocaleString()}</TableCell>
                                    <TableCell align="right">${month.cost.toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </TabPanel>

              {/* Tab 3: Documentation */}
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    API Documentation
                  </Typography>
                  <Typography paragraph>
                    Full API documentation is available at:
                  </Typography>
                  <Button
                    variant="outlined"
                    href="/docs"
                    target="_blank"
                    sx={{ mr: 2 }}
                  >
                    Swagger UI
                  </Button>
                  <Button
                    variant="outlined"
                    href="/redoc"
                    target="_blank"
                  >
                    ReDoc
                  </Button>
                </Box>

                {/* Code Examples */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Code Examples
                  </Typography>

                  <Typography variant="h7" sx={{ mb: 1, mt: 3 }}>
                    Python
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
                    <code>{`import assetpulse

client = assetpulse.APIClient(
    api_key="YOUR_API_KEY",
    api_secret="YOUR_API_SECRET"
)

# Get prediction
prediction = client.get_prediction("BTC")
print(prediction)

# Top predictions
top = client.get_top_predictions()
print(top)`}</code>
                  </Paper>

                  <Typography variant="h7" sx={{ mb: 1, mt: 3 }}>
                    JavaScript
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
                    <code>{`const AssetPulse = require('assetpulse-js');

const client = new AssetPulse({
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_API_SECRET'
});

// Get prediction
const prediction = await client.getPrediction('BTC');
console.log(prediction);`}</code>
                  </Paper>

                  <Typography variant="h7" sx={{ mb: 1, mt: 3 }}>
                    cURL
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
                    <code>{`curl -X GET "https://assetpulse.ai/api/v1/prediction/BTC" \\
  -H "Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET" \\
  -H "Content-Type: application/json"`}</code>
                  </Paper>
                </Box>

                {/* Use Cases */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Popular Use Cases
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Robo-Advisor Integration"
                        secondary="Use predictions for automated trading strategies"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Discord Bot"
                        secondary="Post daily top predictions to Discord"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Slack Integration"
                        secondary="Get alerts in Slack when predictions reach high confidence"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Mobile App"
                        secondary="Fetch real-time predictions for your mobile application"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Trading Bot"
                        secondary="Algorithmic execution based on AssetPulse signals"
                      />
                    </ListItem>
                  </List>
                </Box>
              </TabPanel>

              {/* Tab 4: Pricing */}
              <TabPanel value={tabValue} index={3}>
                <Grid container spacing={3}>
                  {/* Free Tier */}
                  <Grid item xs={12} md={4}>
                    <Card sx={{ border: '1px solid #e0e0e0' }}>
                      <CardContent>
                        <Typography variant="h5" gutterBottom>
                          Free
                        </Typography>
                        <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                          $0
                        </Typography>
                        <Typography color="textSecondary" gutterBottom>
                          Perfect for testing
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText primary="No API access" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Web dashboard access" />
                          </ListItem>
                        </List>
                        <Button variant="outlined" fullWidth disabled>
                          Current Plan
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Pro Tier */}
                  <Grid item xs={12} md={4}>
                    <Card sx={{ border: '2px solid #1976d2', position: 'relative' }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bgcolor: '#1976d2',
                          color: 'white',
                          px: 2,
                          py: 1
                        }}
                      >
                        Popular
                      </Box>
                      <CardContent sx={{ mt: 3 }}>
                        <Typography variant="h5" gutterBottom>
                          Pro
                        </Typography>
                        <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                          $9.99
                        </Typography>
                        <Typography color="textSecondary" gutterBottom sx={{ mb: 2 }}>
                          per month
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText primary="100 calls/minute" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="$0.01 per overage call" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="All API endpoints" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Webhook alerts" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Email support" />
                          </ListItem>
                        </List>
                        <Button variant="contained" fullWidth>
                          Upgrade to Pro
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Enterprise Tier */}
                  <Grid item xs={12} md={4}>
                    <Card sx={{ border: '1px solid #e0e0e0' }}>
                      <CardContent>
                        <Typography variant="h5" gutterBottom>
                          Enterprise
                        </Typography>
                        <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
                          $99
                        </Typography>
                        <Typography color="textSecondary" gutterBottom sx={{ mb: 2 }}>
                          per month
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText primary="1000 calls/minute" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="$0.001 per overage call" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="All API endpoints" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Webhook alerts" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Priority support" />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="50% off 1M+ calls/month" />
                          </ListItem>
                        </List>
                        <Button variant="contained" fullWidth>
                          Contact Sales
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Volume Discount */}
                <Alert severity="info" sx={{ mt: 4 }}>
                  Volume Discounts: Get 50% off on usage costs for 1M+ API calls per month
                </Alert>
              </TabPanel>
            </Paper>
          </>
        )}

        {/* Create API Key Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="API Key Name"
                value={newKeyForm.name}
                onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                fullWidth
                placeholder="e.g., Production Bot, Mobile App"
              />
              <TextField
                select
                label="Pricing Tier"
                value={newKeyForm.pricing_tier}
                onChange={(e) => setNewKeyForm({ ...newKeyForm, pricing_tier: e.target.value })}
                fullWidth
                SelectProps={{
                  native: true
                }}
              >
                <option value="free">Free (No API access)</option>
                <option value="pro">Pro ($9.99/month)</option>
                <option value="enterprise">Enterprise ($99/month)</option>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateKey} variant="contained" color="primary">
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Key Revealed Dialog */}
        <Dialog open={newKeyDialog} maxWidth="sm" fullWidth>
          <DialogTitle>API Key Created Successfully</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Save your API secret now. You won't be able to see it again!
            </Alert>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                API Key
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  value={newKeyData?.api_key || ''}
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <Tooltip title="Copy">
                  <IconButton
                    onClick={() => copyToClipboard(newKeyData?.api_key)}
                  >
                    <FileCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                API Secret
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  value={newKeyData?.api_secret || ''}
                  type={showSecret ? 'text' : 'password'}
                  InputProps={{ readOnly: true }}
                  size="small"
                />
                <Tooltip title="Toggle Visibility">
                  <IconButton
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy">
                  <IconButton
                    onClick={() => copyToClipboard(newKeyData?.api_secret)}
                  >
                    <FileCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewKeyDialog(false)} variant="contained" color="primary">
              Done
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Container>
    </Layout>
  );
}
