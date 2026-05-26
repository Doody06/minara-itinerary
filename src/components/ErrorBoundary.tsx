import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-display font-bold mb-3">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-6">
              An unexpected error occurred. You can return to planning or reload the page.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <a href="/plan">Start Planning</a>
              </Button>
              <Button onClick={() => window.location.reload()}>Reload</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
