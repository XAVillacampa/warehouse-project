import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ClaimsList, NewClaim } from "../types"; // Ensure NewClaim type is defined in types
import {
  fetchClaimsAPI,
  addClaimAPI,
  updateClaimAPI,
  deleteClaimAPI,
  fetchOutboundShipmentsForClaimsAPI,
} from "../services/api";

interface ClaimsState {
  claims: ClaimsList[];
  outboundShipmentsForClaims: any[]; // Adjust the type as per your API response
  fetchClaims: () => Promise<void>;
  addClaim: (claim: NewClaim) => Promise<void>;
  updateClaim: (claim: ClaimsList) => Promise<void>;
  deleteClaim: (claimId: number) => Promise<void>;
  fetchOutboundShipmentsForClaims: () => Promise<void>;
}

export const useClaimsStore = create<ClaimsState>()(
  persist(
    (set, get) => ({
      claims: [],
      outboundShipmentsForClaims: [],

      // Fetch Claims
      fetchClaims: async () => {
        try {
          const response = await fetchClaimsAPI();
          set({ claims: response });
        } catch (error) {
          console.error("Error fetching claims:", error);
        }
      },

      // Add Claim
      addClaim: async (claim: NewClaim) => {
        try {
          const response = await addClaimAPI(claim);
          // console.log("Claim added:", response); // Debug log commented out
          set((state) => ({
            claims: [...state.claims, response?.claim ?? {}], // Use the claim from the response or fallback to an empty object
          }));
        } catch (error) {
          console.error("Error adding claim:", error);
        }
      },

      // Update Claim
      updateClaim: async (claim: ClaimsList) => {
        try {
          const response = await updateClaimAPI(claim.id, claim);
          // console.log("Claim updated:", response); // Debug log commented out
          set((state) => ({
            claims: state.claims.map(
              (c) =>
                c.id === claim.id ? { ...c, ...(response?.claim ?? {}) } : c // Use the updated claim from the response
            ),
          }));
        } catch (error) {
          console.error("Error updating claim:", error);
        }
      },

      // Delete Claim
      deleteClaim: async (claimId: number) => {
        try {
          await deleteClaimAPI(claimId);
          set((state) => ({
            claims: state.claims.filter((claim) => claim.id !== claimId), // Remove the claim from the state
          }));
        } catch (error) {
          console.error("Error deleting claim:", error);
        }
      },

      // Fetch Outbound Shipments for Claims
      fetchOutboundShipmentsForClaims: async () => {
        try {
          const response = await fetchOutboundShipmentsForClaimsAPI();
          set({ outboundShipmentsForClaims: response });
        } catch (error) {
          console.error("Error fetching outbound shipments for claims:", error);
        }
      },
    }),
    {
      name: "claims-storage",
      getStorage: () => localStorage,
      onRehydrateStorage: () => (state) => {
        if (state?.claims) {
          state.claims = state.claims.map((claim) => ({
            ...claim,
            created_at: new Date(claim.created_at),
            updated_at: new Date(claim.updated_at),
          }));
        }
      },
    }
  )
);
