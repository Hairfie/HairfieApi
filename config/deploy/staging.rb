# Simple Role Syntax
# ==================
# Supports bulk-adding hosts to roles, the primary server in each group
# is considered to be the first unless any hosts have the primary
# property set.  Don't declare `role :all`, it's a meta role.

set :node_env, 'staging'

set :newrelic_api_key, '50df3ca9caabde7c20658907c8969e0b7ea3e779f2b7664'
set :newrelic_app_id, '3640357'

# role :app, %w{ns391278.ip-176-31-103.eu}

# Extended Server Syntax
# ======================
# This can be used to drop a more detailed server definition into the
# server list. The second argument is a, or duck-types, Hash and is
# used to set extended properties on the server.

#server 'ns391278.ip-176-31-103.eu', user: 'hairfieapi', roles: %w{app}


# Custom SSH Options
# ==================
# You may pass any option but keep in mind that net/ssh understands a
# limited set of options, consult[net/ssh documentation](http://net-ssh.github.io/net-ssh/classes/Net/SSH.html#method-c-start).
#
# Global options
# --------------
#  set :ssh_options, {
#    keys: %w(/home/rlisowski/.ssh/id_rsa),
#    forward_agent: false,
#    auth_methods: %w(password)
#  }
#
# And/or per server (overrides global)
# ------------------------------------
server 'ns391278.ip-176-31-103.eu',
  user: 'hairfieapi',
  roles: %w{app},
  ssh_options: {
    user: 'deploy', # overrides user setting above
    # keys: %w(/home/user_name/.ssh/id_rsa),
    forward_agent: true,
    # auth_methods: %w(publickey password)
    # password: 'please use keys'
  }
