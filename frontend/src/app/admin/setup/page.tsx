'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getAdminStatus,
  getSchemaStatus,
  bootstrapTenant,
  getTenants,
  getUsers,
  createUser,
  issueToken,
  AdminApiError,
} from '@/lib/admin-api';
import type {
  AdminStatusResponse,
  SchemaStatusResponse,
  Tenant,
  User,
  UserRole,
  TokenResponse,
} from '@/lib/types';
import { VersionInfo } from '@/components/VersionInfo';
import { getLatestReleaseNotes } from '@/lib/release-notes';

type StatusIndicatorProps = {
  status: boolean;
  label: string;
};

function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-3 h-3 rounded-full ${
          status ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}

export default function AdminSetupPage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [status, setStatus] = useState<AdminStatusResponse | null>(null);
    const [schemaStatus, setSchemaStatus] = useState<SchemaStatusResponse | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState<string | null>(null);

  const [bootstrapForm, setBootstrapForm] = useState({
    tenant_name: '',
    founder_email: '',
  });

  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    display_name: '',
    role: 'viewer' as UserRole,
  });

  const [generatedToken, setGeneratedToken] = useState<TokenResponse | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

    const loadStatus = useCallback(async () => {
      if (!adminSecret) return;
    
      try {
        const statusData = await getAdminStatus(adminSecret);
        setStatus(statusData);
      } catch (err) {
        if (err instanceof AdminApiError) {
          setError(`Failed to load status: ${err.message}`);
        }
      }
    }, [adminSecret]);

    const loadSchemaStatus = useCallback(async () => {
      if (!adminSecret) return;
    
      try {
        const schemaData = await getSchemaStatus(adminSecret);
        setSchemaStatus(schemaData);
      } catch (err) {
        if (err instanceof AdminApiError) {
          console.error('Failed to load schema status:', err.message);
        }
      }
    }, [adminSecret]);

  const loadTenants = useCallback(async () => {
    if (!adminSecret) return;
    
    try {
      const { data } = await getTenants(adminSecret);
      setTenants(data);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`Failed to load tenants: ${err.message}`);
      }
    }
  }, [adminSecret]);

  const loadUsers = useCallback(async (tenantId?: string) => {
    if (!adminSecret) return;
    
    try {
      const { data } = await getUsers(adminSecret, tenantId);
      setUsers(data);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(`Failed to load users: ${err.message}`);
      }
    }
  }, [adminSecret]);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const statusData = await getAdminStatus(adminSecret);
      setStatus(statusData);
      setIsAuthenticated(true);
      
      const { data: tenantData } = await getTenants(adminSecret);
      setTenants(tenantData);
      
      if (tenantData.length > 0) {
        setSelectedTenant(tenantData[0]);
        const { data: userData } = await getUsers(adminSecret, tenantData[0].id);
        setUsers(userData);
      }
    } catch (err) {
      if (err instanceof AdminApiError) {
        if (err.code === 'INVALID_ADMIN_SECRET') {
          setError('Invalid admin secret. Please check your ZORA_BOOTSTRAP_SECRET.');
        } else if (err.code === 'MISSING_ADMIN_SECRET') {
          setError('Admin secret is required.');
        } else if (err.code === 'ADMIN_NOT_CONFIGURED') {
          setError('ZORA_BOOTSTRAP_SECRET is not configured on the server.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to authenticate. Please check your connection.');
      }
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsBootstrapping(true);

    try {
      const result = await bootstrapTenant(adminSecret, bootstrapForm);
      setSuccessMessage(`Bootstrap successful! Created tenant "${result.tenant.name}" and founder user "${result.user.email}".`);
      
      await loadStatus();
      await loadTenants();
      
      setSelectedTenant(result.tenant);
      await loadUsers(result.tenant.id);
      
      setBootstrapForm({ tenant_name: '', founder_email: '' });
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('Bootstrap failed. Please try again.');
      }
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleSelectTenant = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    clearMessages();
    await loadUsers(tenant.id);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    clearMessages();
    setIsCreatingUser(true);

    try {
      await createUser(adminSecret, {
        tenant_id: selectedTenant.id,
        email: createUserForm.email,
        display_name: createUserForm.display_name || undefined,
        role: createUserForm.role,
      });
      
      setSuccessMessage(`User "${createUserForm.email}" created successfully.`);
      setCreateUserForm({ email: '', display_name: '', role: 'viewer' });
      
      await loadUsers(selectedTenant.id);
      await loadStatus();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('Failed to create user. Please try again.');
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleGenerateToken = async (user: User) => {
    clearMessages();
    setIsGeneratingToken(user.id);
    setGeneratedToken(null);

    try {
      const tokenResponse = await issueToken(adminSecret, user.id);
      setGeneratedToken(tokenResponse);
      setSuccessMessage(`Token generated for "${user.email}". Copy it below.`);
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('Failed to generate token. Please try again.');
      }
    } finally {
      setIsGeneratingToken(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMessage('Token copied to clipboard!');
    } catch {
      setError('Failed to copy to clipboard. Please copy manually.');
    }
  };

    useEffect(() => {
      if (isAuthenticated && adminSecret) {
        loadStatus();
        loadSchemaStatus();
      }
    }, [isAuthenticated, adminSecret, loadStatus, loadSchemaStatus]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">ZORA CORE</h1>
            <h2 className="mt-2 text-xl text-gray-600">Admin Setup</h2>
            <p className="mt-2 text-sm text-gray-500">
              Enter your admin secret to access the setup panel
            </p>
          </div>

          <form onSubmit={handleAuthenticate} className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <label htmlFor="adminSecret" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Secret (ZORA_BOOTSTRAP_SECRET)
              </label>
              <input
                type="password"
                id="adminSecret"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your admin secret"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !adminSecret}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              Go to Login Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ZORA CORE Admin Setup</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage tenants, users, and generate JWT tokens
            </p>
          </div>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setAdminSecret('');
              setStatus(null);
              setTenants([]);
              setUsers([]);
              setSelectedTenant(null);
              setGeneratedToken(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        <div className="space-y-6">
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
            {status ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusIndicator status={status.supabase_connected} label="Supabase Connected" />
                <StatusIndicator status={status.jwt_secret_configured} label="JWT Secret Configured" />
                <StatusIndicator status={status.bootstrap_secret_configured} label="Bootstrap Secret Configured" />
                <StatusIndicator status={status.tenants_exist} label="Tenants Exist" />
                <StatusIndicator status={status.founder_exists} label="Founder Exists" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Tenants: {status.tenant_count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Users: {status.user_count}</span>
                </div>
              </div>
                      ) : (
                        <p className="text-sm text-gray-500">Loading status...</p>
                      )}
                    </section>

                    <section className="bg-white shadow rounded-lg p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Schema Status</h2>
                      {schemaStatus ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3 h-3 rounded-full ${
                                schemaStatus.schema_ok ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            <span className="text-sm text-gray-700">
                              {schemaStatus.schema_ok ? 'Schema is healthy' : 'Schema has issues'}
                            </span>
                          </div>
                          {schemaStatus.missing_tables.length > 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                              <p className="text-sm font-medium text-red-800 mb-1">Missing Tables:</p>
                              <ul className="text-sm text-red-700 list-disc list-inside">
                                {schemaStatus.missing_tables.map((table) => (
                                  <li key={table}>{table}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {schemaStatus.missing_columns.length > 0 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-sm font-medium text-yellow-800 mb-1">Missing Columns:</p>
                              <ul className="text-sm text-yellow-700 list-disc list-inside">
                                {schemaStatus.missing_columns.map((col) => (
                                  <li key={col}>{col}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            Last checked: {new Date(schemaStatus.checked_at).toLocaleString()}
                          </p>
                          <button
                            onClick={loadSchemaStatus}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Refresh Schema Status
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Loading schema status...</p>
                      )}
                    </section>

                    <section className="bg-white shadow rounded-lg p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Version Info</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        Compare these versions with what you see in Vercel/Cloudflare to verify deployments.
                      </p>
                      <VersionInfo showDetailed className="text-gray-700" />
                    </section>

                    <section className="bg-white shadow rounded-lg p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s New</h2>
                      <div className="space-y-4">
                        {getLatestReleaseNotes(3).map((note) => (
                          <div key={note.iteration} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">
                                Iteration {note.iteration}: {note.title}
                              </span>
                              <span className="text-xs text-gray-500">{note.date}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{note.description}</p>
                            <ul className="text-xs text-gray-500 list-disc list-inside">
                              {note.highlights.slice(0, 2).map((highlight, idx) => (
                                <li key={idx}>{highlight}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>

                    {status && !status.tenants_exist && (
            <section className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bootstrap Tenant</h2>
              <p className="text-sm text-gray-500 mb-4">
                Create your first tenant and founder user to get started.
              </p>
              <form onSubmit={handleBootstrap} className="space-y-4">
                <div>
                  <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    id="tenantName"
                    value={bootstrapForm.tenant_name}
                    onChange={(e) => setBootstrapForm({ ...bootstrapForm, tenant_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., ZORA CORE"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="founderEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Founder Email
                  </label>
                  <input
                    type="email"
                    id="founderEmail"
                    value={bootstrapForm.founder_email}
                    onChange={(e) => setBootstrapForm({ ...bootstrapForm, founder_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="founder@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBootstrapping}
                  className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBootstrapping ? 'Bootstrapping...' : 'Bootstrap Tenant'}
                </button>
              </form>
            </section>
          )}

          {tenants.length > 0 && (
            <section className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Tenants & Users</h2>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Select Tenant</h3>
                <div className="flex flex-wrap gap-2">
                  {tenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => handleSelectTenant(tenant)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedTenant?.id === tenant.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tenant.name} ({tenant.user_count || 0} users)
                    </button>
                  ))}
                </div>
              </div>

              {selectedTenant && (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Users in {selectedTenant.name}
                    </h3>
                    {users.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                              <tr key={user.id}>
                                <td className="px-4 py-2 text-sm text-gray-900">{user.email}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{user.display_name || '-'}</td>
                                <td className="px-4 py-2 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    user.role === 'founder'
                                      ? 'bg-purple-100 text-purple-800'
                                      : user.role === 'brand_admin'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {user.role}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <button
                                    onClick={() => handleGenerateToken(user)}
                                    disabled={isGeneratingToken === user.id}
                                    className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                  >
                                    {isGeneratingToken === user.id ? 'Generating...' : 'Generate Token'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No users found for this tenant.</p>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Create New User</h3>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <input
                          type="email"
                          value={createUserForm.email}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Email"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={createUserForm.display_name}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, display_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Display Name (optional)"
                        />
                      </div>
                      <div>
                        <select
                          value={createUserForm.role}
                          onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value as UserRole })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="brand_admin">Brand Admin</option>
                          <option value="founder">Founder</option>
                        </select>
                      </div>
                      <div>
                        <button
                          type="submit"
                          disabled={isCreatingUser}
                          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCreatingUser ? 'Creating...' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </section>
          )}

          {generatedToken && (
            <section className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated JWT Token</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Token for <strong>{generatedToken.user.email}</strong> ({generatedToken.user.role})
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    Expires: {new Date(generatedToken.expires_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <textarea
                    readOnly
                    value={generatedToken.token}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 font-mono text-xs"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(generatedToken.token)}
                    className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Copy Token
                  </button>
                  <Link
                    href="/login"
                    className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Login
                  </Link>
                </div>
              </div>
            </section>
          )}

          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Login Page
              </Link>
              <Link
                href="/climate"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Climate OS
              </Link>
              <Link
                href="/agents"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Agents Dashboard
              </Link>
              <Link
                href="/journal"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Journal
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
