import ContactForm from '@/components/contact/ContactForm'
import { Mail, MapPin, Phone, Github, Twitter, Linkedin } from 'lucide-react'
import LastWordGradientText from '@/components/LastWordGradientText'

export const metadata = {
  title: 'Contact Us | EventX',
  description: 'Get in touch with us for any questions or feedback.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen w-full bg-grid-white/[0.02] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              <LastWordGradientText>Get in Touch</LastWordGradientText>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
              Have questions about our platform? We're here to help you host incredible events.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left Column: Contact Info */}
            <div className="space-y-12">
              <div className="space-y-8">
                <h2 className="text-2xl font-semibold text-white">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <Mail className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Email Us</h3>
                      <p className="text-gray-400 font-light">support@eventx.com</p>
                      <p className="text-gray-400 font-light">business@eventx.com</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <Phone className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Call Us</h3>
                      <p className="text-gray-400 font-light">+1 (555) 123-4567</p>
                      <p className="text-gray-400 font-light">Mon-Fri from 9am to 6pm</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <MapPin className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Visit Us</h3>
                      <p className="text-gray-400 font-light">123 Innovation Drive</p>
                      <p className="text-gray-400 font-light">Tech City, TC 90210</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-white">Connect with Us</h2>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white">
                    <Github className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-blue-400">
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-blue-600">
                    <Linkedin className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="w-full">
              <div className="relative">
                {/* Decorative blob behind form */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-2xl transform rotate-3" />
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}