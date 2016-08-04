source "https://rubygems.org"
ruby "2.3.0", engine: "jruby", engine_version: "9.1.2.0"

# If on MRI Ruby
# gem "pg", "0.17.1", platform: :ruby
# If on JRuby
gem "pg", "0.17.1", platform: :jruby, git: "git://github.com/headius/jruby-pg.git", branch: :master
gem "jdbc-postgresql", "!= 9.4.1204", platform: :jruby

gem "rollbar"
gem "sequel"
gem "sequel_pg", platform: :ruby, require: false
gem "sinatra", ">= 1.4.7", "< 2.0"
gem "sinatra-contrib"
gem "tzinfo", "= 0.3.51", github: "tzinfo/tzinfo", tag: "v0.3.51"

# Threaded JRuby web server
gem "trinidad"

group :development, :test do
  gem "rspec"
end
