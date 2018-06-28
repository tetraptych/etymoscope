"""Routing for backend API."""
import logging
import json
import random

import flask

import networkx as nx

from flask_cors import CORS


app = flask.Flask(__name__)
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False  # Disable pretty JSON for small responses.
CORS(app, resources={r'/api/*': {'origins': '*'}})

logger = logging.getLogger(__name__)

# Read in etymological relations graph.
GRAPH_DATA_PATH = 'data/graph-data.json'

with open(GRAPH_DATA_PATH, 'r') as f:
    GRAPH_DATA = json.load(f)

GRAPH = nx.Graph()
GRAPH.add_nodes_from(
    zip(
        [node_dict['id'] for node_dict in GRAPH_DATA['nodes']],
        [node_dict for node_dict in GRAPH_DATA['nodes']]
    )
)
GRAPH.add_edges_from([
    (edge_dict['source'], edge_dict['target'])
    for edge_dict in GRAPH_DATA['links']
])

WORD_TO_ID_MAP = {node['word']: node['id'] for node in GRAPH_DATA['nodes']}
ID_TO_WORD_MAP = {node['id']: node['word'] for node in GRAPH_DATA['nodes']}

'''
@app.route('/api/', methods=['GET'])
def get_landing_message():
    """Fetch and return a courteous landing message."""
    response = {'message': 'Hello world!'}
    return flask.jsonify(response)
'''


@app.route('/api/', methods=['GET'])
def get_local_network():
    """Return the neighborhood of the specified word."""
    word = flask.request.args.get('word')
    depth = flask.request.args.get('depth')
    depth = 1 if depth is None else int(depth)

    word_id = WORD_TO_ID_MAP[word]

    # TODO: Avoid be more intelligent here regarding execution time.
    subgraph_ids = [word_id]
    for i in range(depth):
        try:
            # Add all neighbors of all current nodes.
            subgraph_ids += [
                neighbor for _id in subgraph_ids
                for neighbor in list(GRAPH.neighbors(_id))
            ]
            # Remove duplicates.
            subgraph_ids = list(set(subgraph_ids))
        except nx.NetworkXError:
            return

    response_graph = GRAPH.subgraph(subgraph_ids)
    response = nx.readwrite.json_graph.node_link_data(response_graph)
    return flask.jsonify(response)


@app.route('/api/mock/', methods=['GET'])
def mock_get_local_network():
    """Return a mock neighborhood of the specified word."""
    word = flask.request.args.get('word')
    if word is None:
        return

    response_graph = nx.ladder_graph(random.randint(0, 22))
    response = nx.readwrite.json_graph.node_link_data(response_graph)
    return flask.jsonify(response)


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8081)
