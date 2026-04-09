import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import type { SafeUser } from "@shared/schema";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<SafeUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json() as Promise<SafeUser>;
    },
    onSuccess: (userData: SafeUser) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/login");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { companyName: string; companySlug: string; fullName: string; username: string; password: string; email?: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json() as Promise<SafeUser>;
    },
    onSuccess: (userData: SafeUser) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
    },
  });

  const hasPermission = (page: string, action: "canView" | "canCreate" | "canEdit" | "canDelete" = "canView"): boolean => {
    if (!user) return false;
    if (user.role === "super_admin" || user.role === "company_owner") return true;
    const perm = user.permissions?.find(p => p.page === page);
    return perm ? !!perm[action] : false;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation,
    logout: logoutMutation,
    register: registerMutation,
    hasPermission,
  };
}
