import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HourglassIcon } from '@/components/icons'
import { Mail } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <HourglassIcon className="h-12 w-12 text-foreground" />
          <h1 className="text-2xl font-semibold">Hourglass</h1>
        </div>

        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent you a confirmation link to verify your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click the link in your email to activate your account and start reclaiming your calendar.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
