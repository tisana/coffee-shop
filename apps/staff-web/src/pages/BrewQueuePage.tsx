import { useEffect, useMemo, useState } from "react";

import type { Order, StaffUser } from "@coffee-shop/shared/domain/types";

import { QueueConflictMessage } from "../components/QueueConflictMessage";
import { QueueOrderCard } from "../components/QueueOrderCard";
import { ApiClientError } from "../services/apiClient";
import { claimQueueOrder, getQueueOrders } from "../services/queueApi";

interface BrewQueuePageProps {
  staff: StaffUser;
}

export function BrewQueuePage({ staff }: BrewQueuePageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getQueueOrders()
      .then((response) => {
        if (active) {
          setOrders(response.orders);
        }
      })
      .catch((caught) => {
        setError(caught instanceof ApiClientError ? caught.message : "Unable to load brew queue.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const waitingOrders = useMemo(
    () => orders.filter((order) => order.status === "queued"),
    [orders]
  );
  const inProgressOrders = useMemo(
    () => orders.filter((order) => order.status === "in_progress"),
    [orders]
  );

  async function claimOrder(orderId: string) {
    setClaimingOrderId(orderId);
    setError(null);
    setConflict(null);

    try {
      const claimedOrder = await claimQueueOrder(orderId);
      setOrders((current) =>
        current.map((order) => (order.id === claimedOrder.id ? claimedOrder : order))
      );
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        setConflict(caught.message);
      } else {
        setError(caught instanceof ApiClientError ? caught.message : "Unable to claim order.");
      }
    } finally {
      setClaimingOrderId(null);
    }
  }

  return (
    <section className="brew-queue-layout" aria-label="Brew queue">
      <header className="counter-header">
        <div>
          <h2>Brew queue</h2>
          <p>Claim waiting orders and track active brewing work</p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {conflict ? <QueueConflictMessage message={conflict} /> : null}

      {loading ? (
        <p className="empty-state">Loading brew queue.</p>
      ) : (
        <div className="queue-columns">
          <section className="queue-column" aria-labelledby="waiting-orders-heading">
            <div className="queue-column-heading">
              <h3 id="waiting-orders-heading">Waiting</h3>
              <span>{waitingOrders.length}</span>
            </div>
            {waitingOrders.length > 0 ? (
              waitingOrders.map((order) => (
                <QueueOrderCard
                  key={order.id}
                  order={order}
                  currentStaff={staff}
                  claiming={claimingOrderId === order.id}
                  onClaim={claimOrder}
                />
              ))
            ) : (
              <p className="empty-state">No waiting orders.</p>
            )}
          </section>

          <section className="queue-column" aria-labelledby="in-progress-orders-heading">
            <div className="queue-column-heading">
              <h3 id="in-progress-orders-heading">In progress</h3>
              <span>{inProgressOrders.length}</span>
            </div>
            {inProgressOrders.length > 0 ? (
              inProgressOrders.map((order) => (
                <QueueOrderCard
                  key={order.id}
                  order={order}
                  currentStaff={staff}
                  claiming={false}
                  onClaim={claimOrder}
                />
              ))
            ) : (
              <p className="empty-state">No orders in progress.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
