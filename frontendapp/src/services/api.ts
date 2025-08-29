import axios, { AxiosInstance, AxiosError } from 'axios';
import { config, endpoints } from '../config';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.api.post(endpoints.auth.refresh, {
                refreshToken
              });
              
              const { accessToken } = response.data;
              localStorage.setItem('accessToken', accessToken);
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.api.post(endpoints.auth.login, { email, password });
    const { accessToken, refreshToken, user } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    return { user, accessToken };
  }

  async register(username: string, email: string, password: string) {
    const response = await this.api.post(endpoints.auth.register, {
      username,
      email,
      password
    });
    
    const { accessToken, refreshToken, user } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    return { user, accessToken };
  }

  async logout() {
    try {
      await this.api.post(endpoints.auth.logout);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async verifyEmail(token: string) {
    return this.api.post(endpoints.auth.verify, { token });
  }

  async forgotPassword(email: string) {
    return this.api.post(endpoints.auth.forgotPassword, { email });
  }

  async resetPassword(token: string, password: string) {
    return this.api.post(endpoints.auth.resetPassword, { token, password });
  }

  // Project endpoints
  async getProjects() {
    const response = await this.api.get(endpoints.projects.list);
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.api.get(endpoints.projects.get(id));
    return response.data;
  }

  async createProject(projectData: any) {
    const response = await this.api.post(endpoints.projects.create, projectData);
    return response.data;
  }

  async updateProject(id: string, projectData: any) {
    const response = await this.api.put(endpoints.projects.update(id), projectData);
    return response.data;
  }

  async deleteProject(id: string) {
    const response = await this.api.delete(endpoints.projects.delete(id));
    return response.data;
  }

  async getProjectStats(id: string) {
    const response = await this.api.get(endpoints.projects.stats(id));
    return response.data;
  }

  // Deployment endpoints
  async getDeployments(projectId?: string) {
    const response = await this.api.get(endpoints.deployments.list, {
      params: { projectId }
    });
    return response.data;
  }

  async getDeployment(id: string) {
    const response = await this.api.get(endpoints.deployments.get(id));
    return response.data;
  }

  async createDeployment(deploymentData: any) {
    const response = await this.api.post(endpoints.deployments.create, deploymentData);
    return response.data;
  }

  async cancelDeployment(id: string) {
    const response = await this.api.post(endpoints.deployments.cancel(id));
    return response.data;
  }

  async retryDeployment(id: string) {
    const response = await this.api.post(endpoints.deployments.retry(id));
    return response.data;
  }

  async getDeploymentLogs(id: string) {
    const response = await this.api.get(endpoints.deployments.logs(id));
    return response.data;
  }

  // Build endpoints
  async getBuilds(projectId?: string) {
    const response = await this.api.get(endpoints.builds.list, {
      params: { projectId }
    });
    return response.data;
  }

  async getBuild(id: string) {
    const response = await this.api.get(endpoints.builds.get(id));
    return response.data;
  }

  async getBuildLogs(id: string) {
    const response = await this.api.get(endpoints.builds.logs(id));
    return response.data;
  }

  async getBuildArtifacts(id: string) {
    const response = await this.api.get(endpoints.builds.artifacts(id));
    return response.data;
  }

  // Domain endpoints
  async getDomains(projectId?: string) {
    const response = await this.api.get(endpoints.domains.list, {
      params: { projectId }
    });
    return response.data;
  }

  async createDomain(domainData: any) {
    const response = await this.api.post(endpoints.domains.create, domainData);
    return response.data;
  }

  async verifyDomain(id: string) {
    const response = await this.api.post(endpoints.domains.verify(id));
    return response.data;
  }

  async deleteDomain(id: string) {
    const response = await this.api.delete(endpoints.domains.delete(id));
    return response.data;
  }

  async configureDomainSSL(id: string, sslData: any) {
    const response = await this.api.post(endpoints.domains.ssl(id), sslData);
    return response.data;
  }

  // Monitoring endpoints
  async getMetrics(timeRange?: string) {
    const response = await this.api.get(endpoints.monitoring.metrics, {
      params: { timeRange }
    });
    return response.data;
  }

  async getLogs(filter?: any) {
    const response = await this.api.get(endpoints.monitoring.logs, {
      params: filter
    });
    return response.data;
  }

  async getAlerts() {
    const response = await this.api.get(endpoints.monitoring.alerts);
    return response.data;
  }

  async getUptime(projectId?: string) {
    const response = await this.api.get(endpoints.monitoring.uptime, {
      params: { projectId }
    });
    return response.data;
  }

  // Git endpoints
  async getRepositories(provider: string) {
    const response = await this.api.get(endpoints.git.repos, {
      params: { provider }
    });
    return response.data;
  }

  async connectRepository(repoData: any) {
    const response = await this.api.post(endpoints.git.connect, repoData);
    return response.data;
  }

  async getRepoBranches(repoId: string) {
    const response = await this.api.get(endpoints.git.branches(repoId));
    return response.data;
  }
}

export default new ApiService();