import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, RefreshCw, ArrowRight } from "lucide-react";

interface BulkDateChangeProps {
  isOpen: boolean;
  onClose: () => void;
  onDateChange: (newDate: string) => Promise<void>;
  productsCount: number;
  loading?: boolean;
  currentDate?: string; // Add current date prop
}

const BulkDateChange: React.FC<BulkDateChangeProps> = ({
  isOpen,
  onClose,
  onDateChange,
  productsCount,
  loading = false,
  currentDate
}) => {
  const [newDate, setNewDate] = useState<string>(() => {
    // Default to today's date
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const formatDateForDisplay = (dateString: string): string => {
    try {
      // Handle DD/MM/YYYY format from database
      if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        return `${day}/${month}/${year}`;
      }
      
      // Handle ISO date format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear());
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  };

  const handleSubmit = async () => {
    if (!newDate) {
      return;
    }

    // Format date to DD/MM/YYYY format for backend
    const formatDateForDatabase = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return "";
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());
        return `${day}/${month}/${year}`;
      } catch (error) {
        console.error("Date formatting error:", error);
        return "";
      }
    };

    const formattedDate = formatDateForDatabase(newDate);
    if (!formattedDate) {
      return;
    }

    try {
      await onDateChange(formattedDate);
      onClose();
    } catch (error) {
      console.error("Error updating dates:", error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Change Date for All Expenses
          </DialogTitle>
          <DialogDescription>
            Update the date for all {productsCount} expense{productsCount !== 1 ? 's' : ''} in this list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Date Display */}
          {currentDate && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Current Date:
                </span>
                <span className="text-sm font-mono text-gray-900">
                  {formatDateForDisplay(currentDate)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bulk-date" className="text-sm font-medium">
              New Date
            </Label>
            <Input
              id="bulk-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-10"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              This will update the date for all expenses in the current list
            </p>
          </div>
          
          {/* Date Comparison Preview */}
          {newDate && currentDate && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    Date Change Preview:
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">From</div>
                    <div className="px-3 py-2 bg-white rounded border text-sm font-mono">
                      {formatDateForDisplay(currentDate)}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">To</div>
                    <div className="px-3 py-2 bg-white rounded border text-sm font-mono text-blue-700">
                      {(() => {
                        const date = new Date(newDate);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = String(date.getFullYear());
                        return `${day}/${month}/${year}`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New Date Preview (when no current date is provided) */}
          {newDate && !currentDate && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  New Date Format:
                </span>
                <span className="text-sm font-mono text-blue-700">
                  {(() => {
                    const date = new Date(newDate);
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = String(date.getFullYear());
                    return `${day}/${month}/${year}`;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !newDate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Updating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Update All Dates
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDateChange;
