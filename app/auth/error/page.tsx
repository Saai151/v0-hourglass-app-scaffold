import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HourglassIcon } from '@/components/icons'
import { AlertCircle } from 'lucide-react'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  const message = params.message || 'An error occurred during authentication'

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <HourglassIcon className="h-12 w-12 text-foreground" />
          <h1 className="text-2xl font-semibold">Hourglass</h1>
        </div>

        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please try again or contact support if the problem persists.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Create account</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
